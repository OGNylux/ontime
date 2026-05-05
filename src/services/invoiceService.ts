import { supabase } from "../lib/supabase";
import { getActiveWorkspaceId, requireUserId } from "./workspaceContext";
import { CalendarEntry } from "./calendarService";

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceLineItem {
    id?: string;
    invoice_id?: string;
    calendar_entry_id?: string | null;
    project_name?: string | null;
    description: string;
    date: string;
    quantity_hours: number;
    unit_price: number;
    amount?: number;
}

export interface Invoice {
    id: string;
    workspace_id: string;
    client_id: string;
    invoice_number: string;
    status: InvoiceStatus;
    issue_date: string;
    due_date?: string | null;
    currency: string;
    tax_rate: number;
    notes?: string | null;
    created_by: string;
    created_at: string;
    sent_at?: string | null;
    paid_at?: string | null;
    client?: { id: string; name: string };
    line_items?: InvoiceLineItem[];
}

export interface InvoicePdfData {
    invoice: Invoice;
    clientInfo: {
        name: string;
        street?: string | null;
        house_number?: string | null;
        postal_code?: string | null;
        city?: string | null;
        state?: string | null;
        country?: string | null;
        email?: string | null;
        phone?: string | null;
        vat_number?: string | null;
    };
    billing: {
        company_name?: string | null;
        street?: string | null;
        house_number?: string | null;
        postal_code?: string | null;
        city?: string | null;
        state?: string | null;
        country?: string | null;
        email?: string | null;
        phone?: string | null;
        vat_number?: string | null;
        bank_name?: string | null;
        account_holder?: string | null;
        iban?: string | null;
        swift?: string | null;
    } | null;
}

const INVOICE_SELECT = `
    *,
    client:ontime_client(id, name),
    line_items:ontime_invoice_line_item(*)
`;

export const invoiceService = {
    async list(): Promise<Invoice[]> {
        const workspaceId = await getActiveWorkspaceId();
        const { data, error } = await supabase
            .from('ontime_invoice')
            .select(INVOICE_SELECT)
            .eq('workspace_id', workspaceId)
            .order('issue_date', { ascending: false });
        if (error) throw error;
        return data as Invoice[];
    },

    async create(
        invoice: {
            client_id: string;
            issue_date: string;
            due_date?: string | null;
            currency: string;
            tax_rate: number;
            notes?: string | null;
        },
        lineItems: Omit<InvoiceLineItem, 'id' | 'invoice_id' | 'amount'>[],
    ): Promise<Invoice> {
        const workspaceId = await getActiveWorkspaceId();
        const userId = await requireUserId();

        const { data: invoiceNumber, error: numError } = await supabase
            .rpc('generate_invoice_number', { p_workspace_id: workspaceId });
        if (numError) throw numError;

        const { data, error } = await supabase
            .from('ontime_invoice')
            .insert({
                ...invoice,
                workspace_id: workspaceId,
                created_by: userId,
                invoice_number: invoiceNumber as string,
                status: 'draft' as InvoiceStatus,
            })
            .select('id')
            .single();
        if (error) throw error;

        const invoiceId = (data as { id: string }).id;

        if (lineItems.length > 0) {
            const { error: lineError } = await supabase
                .from('ontime_invoice_line_item')
                .insert(lineItems.map((item) => ({ ...item, invoice_id: invoiceId })));
            if (lineError) throw lineError;
        }

        const { data: full, error: fetchError } = await supabase
            .from('ontime_invoice')
            .select(INVOICE_SELECT)
            .eq('id', invoiceId)
            .single();
        if (fetchError) throw fetchError;
        return full as Invoice;
    },

    async updateStatus(id: string, status: InvoiceStatus): Promise<void> {
        const extra: Record<string, string> = {};
        if (status === 'sent') extra.sent_at = new Date().toISOString();
        if (status === 'paid') extra.paid_at = new Date().toISOString();
        const { error } = await supabase
            .from('ontime_invoice')
            .update({ status, ...extra })
            .eq('id', id);
        if (error) throw error;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('ontime_invoice')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    async getForPdf(id: string): Promise<InvoicePdfData> {
        const workspaceId = await getActiveWorkspaceId();

        const [{ data: raw, error }, { data: billing }] = await Promise.all([
            supabase
                .from('ontime_invoice')
                .select(`
                    *,
                    client:ontime_client(*, info:ontime_client_info(*)),
                    line_items:ontime_invoice_line_item(*)
                `)
                .eq('id', id)
                .single(),
            supabase
                .from('ontime_workspace_billing')
                .select('*')
                .eq('workspace_id', workspaceId)
                .maybeSingle(),
        ]);
        if (error) throw error;

        const client = (raw as Record<string, unknown>).client as Record<string, unknown> | null;
        return {
            invoice: raw as Invoice,
            clientInfo: {
                name: (client?.name as string) ?? '',
                ...((client?.info as object) ?? {}),
            },
            billing: billing as InvoicePdfData['billing'],
        };
    },

    async getBillableEntries(clientId: string, startDate: string, endDate: string): Promise<CalendarEntry[]> {
        const workspaceId = await getActiveWorkspaceId();
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
            .from('ontime_calendar_entry')
            .select('*, task:ontime_task(*, project:ontime_project(*, client:ontime_client(*)))')
            .eq('workspace_id', workspaceId)
            .eq('is_billable', true)
            .gte('start_time', start.toISOString())
            .lte('start_time', end.toISOString())
            .order('start_time', { ascending: true });
        if (error) throw error;

        return (data as CalendarEntry[]).filter(
            (e) => e.task?.project?.client?.id === clientId,
        );
    },
};
