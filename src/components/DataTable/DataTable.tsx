import { ReactNode, useMemo, useState } from 'react';
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Checkbox,
    Pagination,
    Typography,
} from '@mui/material';
import LoadingBanner from '../Loading/LoadingBanner';
import SortHeader, { Order } from './SortHeader';

export interface Column<T> {
    field: string | (keyof T & string);
    label: string;
    sortable?: boolean;
    render?: (row: T) => ReactNode;
    align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T extends { id?: string; pinned?: boolean }> {
    data: T[];
    columns: Column<T>[];
    loading?: boolean;
    selectable?: boolean;
    selectedIds?: string[];
    onSelectionChange?: (ids: string[]) => void;
    rowsPerPage?: number;
    defaultSortField?: string | (keyof T & string);
    defaultSortOrder?: Order;
    onRowClick?: (row: T) => void;
    rowActions?: (row: T) => ReactNode;
    emptyMessage?: string;
    getRowId?: (row: T) => string;
    bulkActions?: ReactNode;
    isRowSelectable?: (row: T) => boolean;
    disableSorting?: boolean;
    /** Group rows by the returned key; rows in the same group stay adjacent. */
    groupBy?: (row: T) => string | undefined;
    /** When true, rows with `pinned: true` always come first. Defaults to true. */
    pinFirst?: boolean;
}

const cellSx = { borderBottom: '1px solid', borderColor: 'divider' } as const;

function compareValues(aVal: unknown, bVal: unknown, order: Order): number {
    if (aVal === undefined || aVal === null) return order === 'asc' ? 1 : -1;
    if (bVal === undefined || bVal === null) return order === 'asc' ? -1 : 1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
        return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'asc' ? aVal - bVal : bVal - aVal;
    }

    const aStr = String(aVal);
    const bStr = String(bVal);
    return order === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
}

function makeRowComparator<T extends { pinned?: boolean }>(
    orderBy: keyof T,
    order: Order,
    pinFirst: boolean,
) {
    return (a: T, b: T): number => {
        if (pinFirst) {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
        }
        return compareValues(a[orderBy], b[orderBy], order);
    };
}

export default function DataTable<T extends { id?: string; pinned?: boolean }>({
    data,
    columns,
    loading = false,
    selectable = false,
    selectedIds = [],
    onSelectionChange,
    rowsPerPage = 10,
    defaultSortField,
    defaultSortOrder = 'asc',
    rowActions,
    emptyMessage = 'No data found',
    getRowId = (row) => row.id ?? '',
    bulkActions,
    isRowSelectable = () => true,
    disableSorting = false,
    groupBy,
    pinFirst = true,
}: DataTableProps<T>) {
    type OrderBy = (keyof T & string) | '';

    const [order, setOrder] = useState<Order>(defaultSortOrder);
    const [orderBy, setOrderBy] = useState<OrderBy>(disableSorting ? '' : ((defaultSortField as OrderBy) || ''));
    const [page, setPage] = useState(1);

    const handleSort = (field: string) => {
        if (disableSorting) return;
        const isAsc = orderBy === field && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(field as OrderBy);
    };

    const sortedData = useMemo(() => {
        if (disableSorting || !orderBy) return data;
        const compare = makeRowComparator<T>(orderBy as keyof T, order, pinFirst);

        if (!groupBy) return [...data].sort(compare);

        const groups = new Map<string | symbol, T[]>();
        data.forEach((row) => {
            const key = groupBy(row) ?? Symbol();
            const bucket = groups.get(key);
            if (bucket) bucket.push(row);
            else groups.set(key, [row]);
        });

        return Array.from(groups.values())
            .sort((a, b) => compare(a[0], b[0]))
            .flat();
    }, [data, orderBy, order, disableSorting, groupBy, pinFirst]);

    const paginatedData = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        return sortedData.slice(start, start + rowsPerPage);
    }, [sortedData, page, rowsPerPage]);

    const totalPages = Math.ceil(sortedData.length / rowsPerPage);

    const handleSelectAll = (checked: boolean) => {
        if (!onSelectionChange) return;
        const selectableRows = paginatedData.filter(isRowSelectable);
        onSelectionChange(checked ? selectableRows.map(getRowId) : []);
    };

    const handleSelectRow = (id: string) => {
        if (!onSelectionChange) return;
        onSelectionChange(
            selectedIds.includes(id)
                ? selectedIds.filter((sid) => sid !== id)
                : [...selectedIds, id]
        );
    };

    const selectableRows = paginatedData.filter(isRowSelectable);
    const allSelected = selectableRows.length > 0 && selectableRows.every((row) => selectedIds.includes(getRowId(row)));
    const someSelected = selectableRows.some((row) => selectedIds.includes(getRowId(row))) && !allSelected;

    const totalCols = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);

    return (
        <Box display="flex" flexDirection="column" flex={1} minHeight={0}>
            <TableContainer sx={{ flex: 1, minHeight: 0, overflowX: 'auto', width: '100%' }}>
                <Table stickyHeader sx={{ minWidth: '100%', width: '100%', tableLayout: 'auto', '& .MuiTableRow-root': { borderBottom: '1px solid', borderColor: 'divider' }, '& td, & th': { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }}>
                    <TableHead>
                        {selectedIds.length > 0 && bulkActions ? (
                            <TableRow>
                                {selectable && (
                                    <TableCell padding="checkbox" sx={cellSx}>
                                        <Checkbox
                                            indeterminate={someSelected}
                                            checked={allSelected}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                        />
                                    </TableCell>
                                )}
                                <TableCell colSpan={columns.length + (rowActions ? 1 : 0)} sx={cellSx}>
                                    <Box display="flex" alignItems="center" gap={2}>
                                        <Typography variant="subtitle2" fontWeight="bold">
                                            {selectedIds.length} selected
                                        </Typography>
                                        {bulkActions}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ) : (
                            <TableRow>
                                {selectable && (
                                    <TableCell padding="checkbox" sx={cellSx}>
                                        <Checkbox
                                            indeterminate={someSelected}
                                            checked={allSelected}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                        />
                                    </TableCell>
                                )}
                                {columns.map((col) => (
                                    <TableCell key={col.field} align={col.align || 'left'} sx={cellSx}>
                                        {col.sortable !== false && !disableSorting ? (
                                            <SortHeader
                                                label={col.label}
                                                field={col.field}
                                                orderBy={orderBy}
                                                order={order}
                                                onSort={handleSort}
                                            />
                                        ) : (
                                            col.label
                                        )}
                                    </TableCell>
                                ))}
                                {rowActions && <TableCell align="right" sx={cellSx} />}
                            </TableRow>
                        )}
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={totalCols} align="center" sx={{ ...cellSx, p: 2 }}>
                                    <LoadingBanner message="Loading..." />
                                </TableCell>
                            </TableRow>
                        ) : paginatedData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={totalCols} align="center" sx={cellSx}>
                                    <Typography color="text.secondary">{emptyMessage}</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedData.map((row) => {
                                const rowId = getRowId(row);
                                const isSelected = selectedIds.includes(rowId);
                                const rowSelectable = isRowSelectable(row);
                                return (
                                    <TableRow
                                        key={rowId}
                                        hover
                                        selected={isSelected}
                                        sx={{
                                            '&:hover .row-checkbox': { opacity: 1, pointerEvents: 'auto' },
                                            ...cellSx,
                                        }}
                                    >
                                        {selectable && (
                                            <TableCell padding="checkbox" sx={cellSx}>
                                                {rowSelectable ? (
                                                    <Checkbox
                                                        className="row-checkbox"
                                                        sx={{
                                                            opacity: isSelected ? 1 : 0,
                                                            transition: 'opacity 150ms ease',
                                                            pointerEvents: isSelected ? 'auto' : 'none',
                                                        }}
                                                        checked={isSelected}
                                                        onChange={() => handleSelectRow(rowId)}
                                                    />
                                                ) : null}
                                            </TableCell>
                                        )}
                                        {columns.map((col) => (
                                            <TableCell key={col.field} align={col.align || 'left'} sx={cellSx}>
                                                {col.render
                                                    ? col.render(row)
                                                    : (typeof col.field === 'string' && col.field in (row as unknown as Record<string, unknown>))
                                                        ? String((row as unknown as Record<string, unknown>)[col.field] ?? '-')
                                                        : '-'}
                                            </TableCell>
                                        ))}
                                        {rowActions && (
                                            <TableCell align="right" sx={cellSx}>
                                                {rowActions(row)}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {totalPages > 1 && (
                <Box display="flex" justifyContent="center" mt={2}>
                    <Pagination
                        count={totalPages}
                        page={page}
                        onChange={(_, value) => setPage(value)}
                        color="secondary"
                        showFirstButton
                        showLastButton
                    />
                </Box>
            )}
        </Box>
    );
}
