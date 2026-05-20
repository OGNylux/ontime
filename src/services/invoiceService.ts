import { supabase } from "../lib/supabase";
import { getActiveWorkspaceId, requireUserId } from "./workspaceContext";
import { CalendarEntry } from "./calendarService";
import type { Tables } from "../lib/database.types";

type InvoiceRow = Tables<'ontime_invoice'>;
type InvoiceLineItemRow = Tables<'ontime_invoice_line_item'>;

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceLineItem extends Omit<InvoiceLineItemRow, 'id' | 'invoice_id' | 'amount' | 'created_at'> {
    id?: string;
    invoice_id?: string;
    amount?: number;
    created_at?: string;
    project_name?: string | null;
}

export interface Invoice extends Omit<InvoiceRow, 'status' | 'client_id'> {
    status: InvoiceStatus;
    client_id: string;
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
            .order('issue_date', { ascending: false })
            .returns<Invoice[]>();
        if (error) throw error;
        return data ?? [];
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
                invoice_number: invoiceNumber,
                status: 'draft' as InvoiceStatus,
            })
            .select('id')
            .single();
        if (error) throw error;

        const invoiceId = data.id;

        if (lineItems.length > 0) {
            const { error: lineError } = await supabase
                .from('ontime_invoice_line_item')
                .insert(lineItems.map(({ project_name: _p, ...item }) => ({ ...item, invoice_id: invoiceId })));
            if (lineError) throw lineError;
        }

        const { data: full, error: fetchError } = await supabase
            .from('ontime_invoice')
            .select(INVOICE_SELECT)
            .eq('id', invoiceId)
            .returns<Invoice>()
            .single();
        if (fetchError) throw fetchError;
        return full;
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
                    line_items:ontime_invoice_line_item(*, calendar_entry:ontime_calendar_entry(task:ontime_task(project:ontime_project(name))))
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
        const invoice = raw as Invoice;
        if (invoice.line_items) {
            invoice.line_items = invoice.line_items.map((item) => {
                const entry = ((item as unknown) as Record<string, unknown>).calendar_entry as Record<string, unknown> | null;
                const projectName = (entry?.task as Record<string, unknown> | null)?.project as Record<string, unknown> | null;
                return { ...item, project_name: (projectName?.name as string) ?? null };
            });
        }
        return {
            invoice,
            clientInfo: {
                name: (client?.name as string) ?? '',
                ...((client?.info as object) ?? {}),
            },
            billing: billing as InvoicePdfData['billing'],
        };
    },

    async getPreviewData(clientId: string): Promise<Pick<InvoicePdfData, 'clientInfo' | 'billing'>> {
        const workspaceId = await getActiveWorkspaceId();
        const [{ data: clientData }, { data: billing }] = await Promise.all([
            supabase
                .from('ontime_client')
                .select('*, info:ontime_client_info(*)')
                .eq('id', clientId)
                .single(),
            supabase
                .from('ontime_workspace_billing')
                .select('*')
                .eq('workspace_id', workspaceId)
                .maybeSingle(),
        ]);
        const client = clientData as Record<string, unknown> | null;
        return {
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
            .order('start_time', { ascending: true })
            .returns<CalendarEntry[]>();
        if (error) throw error;

        return (data ?? []).filter(
            (e) => e.task?.project?.client?.id === clientId,
        );
    },
};
