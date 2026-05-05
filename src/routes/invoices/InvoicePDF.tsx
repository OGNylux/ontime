import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import dayjs from 'dayjs';
import { InvoicePdfData } from '../../services/invoiceService';

const TEXT = '#1a1a1a';
const MUTED = '#6b7280';
const BORDER = '#d1d5db';

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: TEXT,
        paddingTop: 44,
        paddingBottom: 60,
        paddingHorizontal: 50,
        backgroundColor: '#ffffff',
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
    },
    fromBlock: { flex: 1 },
    senderName: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
    addressLine: { fontSize: 9, color: MUTED, marginBottom: 1 },

    metaBlock: { alignItems: 'flex-end' },
    metaRow: { flexDirection: 'row', marginBottom: 3 },
    metaLabel: { fontSize: 9, color: MUTED, width: 90, textAlign: 'left' },
    metaValue: { fontSize: 9, color: TEXT, marginLeft: 10, width: 90, textAlign: 'left' },

    clientBlock: { marginBottom: 36 },
    clientName: { fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 2 },

    invoiceTitle: {
        fontSize: 18,
        fontFamily: 'Helvetica-Bold',
        color: TEXT,
        marginBottom: 16,
    },

    descriptionList: { marginBottom: 20 },
    descGroupTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
    descItem: { fontSize: 9, color: MUTED, marginBottom: 1, paddingLeft: 8 },

    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
        paddingBottom: 5,
        marginBottom: 4,
    },
    tableHeaderCell: {
        fontSize: 9,
        color: MUTED,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
    },
    tableCell: { fontSize: 9, color: TEXT },

    colDesc: { flex: 1 },
    colQty: { width: 50, textAlign: 'right' },
    colUnit: { width: 30, textAlign: 'right' },
    colRate: { width: 70, textAlign: 'right' },
    colAmount: { width: 70, textAlign: 'right' },

    totalsSection: { alignItems: 'flex-end', marginTop: 10, marginBottom: 40 },
    grandTotalRow: { flexDirection: 'row', marginTop: 4 },
    grandTotalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', width: 110, textAlign: 'right', marginRight: 10 },
    grandTotalValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', width: 70, textAlign: 'right' },

    taskGroupHeader: {
        borderBottomWidth: 1,
        borderBottomColor: BORDER,
        paddingBottom: 3,
        marginTop: 6,
        marginBottom: 2,
    },
    taskGroupTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: TEXT },
    taskRow: { paddingVertical: 3, paddingLeft: 8 },
    taskCell: { fontSize: 9, color: MUTED },

    notesText: {
        fontSize: 9,
        color: MUTED,
        textAlign: 'center',
        position: 'absolute',
        bottom: 72,
        left: 50,
        right: 50,
    },

    footer: {
        position: 'absolute',
        bottom: 24,
        left: 50,
        right: 50,
        borderTopWidth: 1,
        borderTopColor: BORDER,
        paddingTop: 8,
    },
    footerRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
    footerText: { fontSize: 8, color: MUTED },
});

function sym(currency: string) {
    if (currency === 'EUR') return '€';
    if (currency === 'USD') return '$';
    if (currency === 'GBP') return '£';
    return currency + ' ';
}

function addressLines(info: {
    street?: string | null;
    house_number?: string | null;
    postal_code?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
}): string[] {
    const lines: string[] = [];
    const street = [info.street, info.house_number].filter(Boolean).join(' ');
    if (street) lines.push(street);
    const cityLine = [info.postal_code, info.city].filter(Boolean).join(' ');
    if (cityLine) lines.push(cityLine);
    if (info.state) lines.push(info.state);
    if (info.country) lines.push(info.country);
    return lines;
}

interface ProjectGroup {
    name: string;
    unitPrice: number;
    hours: number;
    tasks: string[];
}

function groupByProject(items: InvoicePdfData['invoice']['line_items']): ProjectGroup[] {
    const map = new Map<string, ProjectGroup>();
    for (const item of items ?? []) {
        const key = item.project_name ?? 'Other';
        if (!map.has(key)) {
            map.set(key, { name: key, unitPrice: item.unit_price, hours: 0, tasks: [] });
        }
        const g = map.get(key)!;
        g.hours += item.quantity_hours;
        if (!g.tasks.includes(item.description)) g.tasks.push(item.description);
    }
    return Array.from(map.values());
}

export function InvoicePDF({ invoice, clientInfo, billing }: InvoicePdfData) {
    const s = sym(invoice.currency);
    const groups = groupByProject(invoice.line_items);
    const subtotal = groups.reduce((acc, g) => acc + g.hours * g.unitPrice, 0);
    const taxAmount = subtotal * (invoice.tax_rate / 100);
    const total = subtotal + taxAmount;

    return (
        <Document title={`Invoice ${invoice.invoice_number}`} author={billing?.company_name ?? undefined}>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View style={styles.fromBlock}>
                        {billing?.company_name && (
                            <Text style={styles.senderName}>{billing.company_name}</Text>
                        )}
                        {addressLines(billing ?? {}).map((line, i) => (
                            <Text key={i} style={styles.addressLine}>{line}</Text>
                        ))}
                    </View>

                    <View style={styles.metaBlock}>
                        {([
                            ['Invoice number:', invoice.invoice_number],
                            ['Invoice date:', dayjs(invoice.issue_date).format('DD.MM.YYYY')],
                            ['Payment terms:', '30 days'],
                            ...(invoice.due_date ? [['Due date:', dayjs(invoice.due_date).format('DD.MM.YYYY')]] : []),
                            ...(billing?.vat_number ? [['VAT number:', billing.vat_number]] : []),
                        ] as [string, string][]).map(([label, value], i) => (
                            <View key={i} style={styles.metaRow}>
                                <Text style={styles.metaLabel}>{label}</Text>
                                <Text style={styles.metaValue}>{value}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.clientBlock}>
                    <Text style={styles.clientName}>{clientInfo.name}</Text>
                    {addressLines(clientInfo).map((line, i) => (
                        <Text key={i} style={styles.addressLine}>{line}</Text>
                    ))}
                    {clientInfo.email && <Text style={styles.addressLine}>{clientInfo.email}</Text>}
                </View>

                <Text style={styles.invoiceTitle}>INVOICE</Text>

                <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, styles.colDesc]}>Project</Text>
                    <Text style={[styles.tableHeaderCell, styles.colQty]}>Hours</Text>
                    <Text style={[styles.tableHeaderCell, styles.colUnit]}>Unit</Text>
                    <Text style={[styles.tableHeaderCell, styles.colRate]}>Unit price</Text>
                    <Text style={[styles.tableHeaderCell, styles.colAmount]}>Total</Text>
                </View>
                {groups.map((g, i) => (
                    <View key={i} style={styles.tableRow}>
                        <Text style={[styles.tableCell, styles.colDesc]}>{g.name}</Text>
                        <Text style={[styles.tableCell, styles.colQty]}>{g.hours.toFixed(2)}</Text>
                        <Text style={[styles.tableCell, styles.colUnit]}>h</Text>
                        <Text style={[styles.tableCell, styles.colRate]}>{s}{g.unitPrice.toFixed(2)}</Text>
                        <Text style={[styles.tableCell, styles.colAmount]}>{s}{(g.hours * g.unitPrice).toFixed(2)}</Text>
                    </View>
                ))}

                <View style={styles.totalsSection}>
                    {invoice.tax_rate > 0 && (
                        <View style={styles.grandTotalRow}>
                            <Text style={[styles.grandTotalLabel, { fontFamily: 'Helvetica', color: MUTED }]}>
                                Subtotal
                            </Text>
                            <Text style={[styles.grandTotalValue, { fontFamily: 'Helvetica', color: MUTED }]}>
                                {s}{subtotal.toFixed(2)}
                            </Text>
                        </View>
                    )}
                    {invoice.tax_rate > 0 && (
                        <View style={styles.grandTotalRow}>
                            <Text style={[styles.grandTotalLabel, { fontFamily: 'Helvetica', color: MUTED }]}>
                                Tax ({invoice.tax_rate}%)
                            </Text>
                            <Text style={[styles.grandTotalValue, { fontFamily: 'Helvetica', color: MUTED }]}>
                                {s}{taxAmount.toFixed(2)}
                            </Text>
                        </View>
                    )}
                    <View style={[styles.grandTotalRow, { marginTop: 4 }]}>
                        <Text style={styles.grandTotalLabel}>Total amount due</Text>
                        <Text style={styles.grandTotalValue}>{s}{total.toFixed(2)}</Text>
                    </View>
                </View>

                {groups.map((g, gi) => (
                    <View key={gi} style={{ marginBottom: 8 }}>
                        <View style={styles.taskGroupHeader}>
                            <Text style={styles.taskGroupTitle}>{g.name}</Text>
                        </View>
                        {g.tasks.map((task, ti) => (
                            <View key={ti} style={styles.taskRow}>
                                <Text style={styles.taskCell}>{task}</Text>
                            </View>
                        ))}
                    </View>
                ))}

                {invoice.notes && (
                    <Text style={styles.notesText}>{invoice.notes}</Text>
                )}

                <View style={styles.footer} fixed>
                    <View style={styles.footerRow}>
                        {billing?.street && (
                            <Text style={styles.footerText}>
                                {addressLines(billing ?? {}).join(' • ')}
                            </Text>
                        )}
                        {billing?.vat_number && (
                            <Text style={styles.footerText}>VAT {billing.vat_number}</Text>
                        )}
                    </View>
                    {(billing?.bank_name || billing?.iban || billing?.swift || billing?.account_holder) && (
                        <View style={[styles.footerRow, { marginTop: 3 }]}>
                            {billing?.bank_name && <Text style={styles.footerText}>{billing.bank_name}</Text>}
                            {billing?.account_holder && <Text style={styles.footerText}>Holder: {billing.account_holder}</Text>}
                            {billing?.iban && <Text style={styles.footerText}>IBAN: {billing.iban}</Text>}
                            {billing?.swift && <Text style={styles.footerText}>BIC: {billing.swift}</Text>}
                        </View>
                    )}
                </View>

            </Page>
        </Document>
    );
}