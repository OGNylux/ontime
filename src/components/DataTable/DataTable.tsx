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
import SortHeader, { Order } from './SortHeader';

export interface Column<T> {
    field: string;
    label: string;
    sortable?: boolean;
    render?: (row: T) => ReactNode;
    align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T extends { id?: string }> {
    data: T[];
    columns: Column<T>[];
    loading?: boolean;
    selectable?: boolean;
    selectedIds?: string[];
    onSelectionChange?: (ids: string[]) => void;
    rowsPerPage?: number;
    defaultSortField?: string;
    defaultSortOrder?: Order;
    onRowClick?: (row: T) => void;
    rowActions?: (row: T) => ReactNode;
    emptyMessage?: string;
    getRowId?: (row: T) => string;
    bulkActions?: ReactNode;
}

export default function DataTable<T extends { id?: string }>({
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
}: DataTableProps<T>) {
    const [order, setOrder] = useState<Order>(defaultSortOrder);
    const [orderBy, setOrderBy] = useState<string>(defaultSortField || columns[0]?.field || '');
    const [page, setPage] = useState(1);

    const handleSort = (field: string) => {
        const isAsc = orderBy === field && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(field);
    };

    const sortedData = useMemo(() => {
        if (!orderBy) return data;
        return [...data].sort((a, b) => {
            // Check if items have a 'pinned' property and always sort pinned items to the top
            const aPinned = (a as Record<string, unknown>).pinned;
            const bPinned = (b as Record<string, unknown>).pinned;
            
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            
            // If both have same pinned status, sort by the selected column
            const aVal = (a as Record<string, unknown>)[orderBy];
            const bVal = (b as Record<string, unknown>)[orderBy];
            
            if (aVal === undefined || aVal === null) return order === 'asc' ? 1 : -1;
            if (bVal === undefined || bVal === null) return order === 'asc' ? -1 : 1;
            
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return order === 'asc' 
                    ? aVal.localeCompare(bVal) 
                    : bVal.localeCompare(aVal);
            }
            
            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, orderBy, order]);

    const paginatedData = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        return sortedData.slice(start, start + rowsPerPage);
    }, [sortedData, page, rowsPerPage]);

    const totalPages = Math.ceil(sortedData.length / rowsPerPage);

    const handleSelectAll = (checked: boolean) => {
        if (!onSelectionChange) return;
        onSelectionChange(checked ? paginatedData.map(getRowId) : []);
    };

    const handleSelectRow = (id: string) => {
        if (!onSelectionChange) return;
        onSelectionChange(
            selectedIds.includes(id)
                ? selectedIds.filter((sid) => sid !== id)
                : [...selectedIds, id]
        );
    };

    const allSelected = paginatedData.length > 0 && paginatedData.every((row) => selectedIds.includes(getRowId(row)));
    const someSelected = paginatedData.some((row) => selectedIds.includes(getRowId(row))) && !allSelected;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <TableContainer sx={{ flex: 1, minHeight: 0, overflowX: { xs: 'auto', md: 'visible' } }}>
                <Table stickyHeader sx={{ minWidth: 700, '& .MuiTableRow-root': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                    <TableHead>
                        {selectedIds.length > 0 && bulkActions ? (
                            <TableRow>
                                {selectable && (
                                    <TableCell padding="checkbox" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                                        <Checkbox
                                            indeterminate={someSelected}
                                            checked={allSelected}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                        />
                                    </TableCell>
                                )}
                                <TableCell
                                    colSpan={columns.length + (rowActions ? 1 : 0)}
                                    sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                                >
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
                                    <TableCell padding="checkbox" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                                        <Checkbox
                                            indeterminate={someSelected}
                                            checked={allSelected}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                        />
                                    </TableCell>
                                )}
                                {columns.map((col) => (
                                    <TableCell key={col.field} align={col.align || 'left'} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                                        {col.sortable !== false ? (
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
                                {rowActions && <TableCell align="right" sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}
                            </TableRow>
                        )}
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} align="center" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : paginatedData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)} align="center" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                                    <Typography color="text.secondary">{emptyMessage}</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedData.map((row) => {
                                const rowId = getRowId(row);
                                const isSelected = selectedIds.includes(rowId);
                                return (
                                    <TableRow
                                        key={rowId}
                                        hover
                                        selected={isSelected}
                                        sx={{
                                            '&:hover .row-checkbox': { opacity: 1, pointerEvents: 'auto' },
                                            borderBottom: '1px solid',
                                            borderColor: 'divider',
                                        }}
                                    >
                                        {selectable && (
                                            <TableCell padding="checkbox" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
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
                                            </TableCell>
                                        )}
                                        {columns.map((col) => (
                                            <TableCell key={col.field} align={col.align || 'left'} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                                                {col.render 
                                                    ? col.render(row) 
                                                    : String((row as Record<string, unknown>)[col.field] ?? '-')}
                                            </TableCell>
                                        ))}
                                        {rowActions && (
                                            <TableCell align="right" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
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
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Pagination
                        count={totalPages}
                        page={page}
                        onChange={(_, value) => setPage(value)}
                        color="primary"
                        showFirstButton
                        showLastButton
                    />
                </Box>
            )}
        </Box>
    );
}
