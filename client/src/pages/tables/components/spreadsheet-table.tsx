import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useTable, useStore } from 'tinybase/ui-react';
import {
    Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TextField, InputAdornment, Typography, Snackbar
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTheme } from '@mui/material/styles';
import { useVirtualizer } from '@tanstack/react-virtual';
import ReadOnlyTinyBaseCell from './readonly-tinybase-cell';

interface SpreadsheetTableProps {
    tableId: string;
}

const SpreadsheetTable: React.FC<SpreadsheetTableProps> = React.memo(({ tableId }) => {
    // Snackbar state for copy feedback
    const [copySnackbarOpen, setCopySnackbarOpen] = useState(false);
    const [copiedCellValue, setCopiedCellValue] = useState<string>('');
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const headerRowRef = useRef<HTMLTableRowElement>(null);
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

    // Ref to store previous widths for comparison
    const prevWidthsRef = useRef<Record<string, number>>({});

    // Debounce timer for resize events
    const resizeTimerRef = useRef<number | null>(null);

    // Copy to clipboard logic (from singular-info-dialog.tsx)

    // Copy to clipboard logic (from singular-info-dialog.tsx)
    const handleCopyCell = useCallback(async (value: string) => {
        if (value !== undefined && value !== null) {
            try {
                await navigator.clipboard.writeText(value);
                setCopiedCellValue(value);
                setCopySnackbarOpen(true);
            } catch (err) {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = value;
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                    setCopiedCellValue(value);
                    setCopySnackbarOpen(true);
                } catch (fallbackErr) {
                    // Optionally handle error
                }
                document.body.removeChild(textArea);
            }
        }
    }, []);

    // Auto-close snackbar after 2 seconds
    useEffect(() => {
        if (copySnackbarOpen) {
            const timer = setTimeout(() => {
                setCopySnackbarOpen(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [copySnackbarOpen]);

    // Memoize the snackbar close handler to prevent unnecessary re-renders
    const handleSnackbarClose = useCallback(() => {
        setCopySnackbarOpen(false);
    }, []);

    // Memoize the snackbar message to prevent unnecessary re-renders
    const snackbarMessage = useMemo(() => {
        return copiedCellValue ? `Copied: ${copiedCellValue}` : 'Copied!';
    }, [copiedCellValue]);

    const theme = useTheme();
    const store = useStore();

    // Get the actual TinyBase table ID using the pattern
    const getInternalTableId = () => {
        // Get the table name from DataTables
        const tableName = store?.getCell('DataTables', tableId, 'name');
        return tableName ? `$${tableName}$` : '';
    };

    const internalTableId = getInternalTableId();
    const table = useTable(internalTableId) || {};

    // Headers are stored in a special row '__headers__' in the table
    const headerRow = table['__headers__'] || {};
    const headerKeys = Object.keys(headerRow);

    // Search filter state
    const [searchFilter, setSearchFilter] = useState('');

    // Filtered data rows based on search
    const dataRowIds = Object.keys(table).filter(rowId =>
        rowId !== '__headers__' &&
        (searchFilter === '' ||
            Object.values(table[rowId] || {}).some(cellValue =>
                String(cellValue).toLowerCase().includes(searchFilter.toLowerCase())
            ))
    );

    // Check if the table is empty (no headers and no data)
    const isTableEmpty = headerKeys.length === 0 && dataRowIds.length === 0;

    // Memoize the getItemKey function to maintain stable identity across renders
    const getItemKey = useCallback((index: number) => dataRowIds[index] || `index-${index}`,
        [dataRowIds]
    );

    // Memoize the estimateSize function to maintain stable identity
    const estimateSize = useCallback(() => 24, []); // Row height in pixels

    // Create virtualizer for the table rows with memoized dependencies
    const rowVirtualizer = useVirtualizer({
        count: dataRowIds.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize,
        overscan: 5, // Number of items to render before/after the visible area
        getItemKey,
    });

    // Update column widths when header cells change size
    useEffect(() => {
        // Skip if table is empty or headers haven't loaded
        if (isTableEmpty || !headerKeys.length) return;

        const updateColumnWidths = () => {
            if (!headerRowRef.current) return;

            const headerCells = headerRowRef.current.querySelectorAll('.header-cell');
            const newWidths: Record<string, number> = {};
            let hasChanges = false;

            headerCells.forEach((cell, index) => {
                const colKey = headerKeys[index];
                if (colKey) {
                    const width = cell.getBoundingClientRect().width;
                    newWidths[colKey] = width;

                    // Check if width has changed
                    if (prevWidthsRef.current[colKey] !== width) {
                        hasChanges = true;
                    }
                }
            });

            // Only update state if widths have actually changed
            if (hasChanges) {
                prevWidthsRef.current = { ...newWidths };
                setColumnWidths(newWidths);
            }
        };

        // Initial update
        updateColumnWidths();

        // Setup resize observer with debounce
        const handleResize = () => {
            // Clear any existing timer
            if (resizeTimerRef.current !== null) {
                window.clearTimeout(resizeTimerRef.current);
            }

            // Set a new timer
            resizeTimerRef.current = window.setTimeout(() => {
                updateColumnWidths();
                resizeTimerRef.current = null;
            }, 100); // 100ms debounce
        };

        const resizeObserver = new ResizeObserver(handleResize);

        if (tableContainerRef.current) {
            resizeObserver.observe(tableContainerRef.current);
        }

        return () => {
            if (resizeTimerRef.current !== null) {
                window.clearTimeout(resizeTimerRef.current);
            }
            resizeObserver.disconnect();
        };
    }, [headerKeys.length, isTableEmpty]);

    // Memoize row rendering for performance
    const renderVirtualRow = useCallback((virtualRow: any) => {
        const rowId = dataRowIds[virtualRow.index];
        if (!rowId) return null;

        return (
            <div
                key={rowId}
                data-index={virtualRow.index}
                data-row-id={rowId}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    height: '24px',
                    transform: `translateY(${virtualRow.start}px)`,
                    display: 'flex',
                    backgroundColor: theme.palette.background.default,
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = theme.palette.action.hover;
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = theme.palette.background.default;
                }}
            >
                {headerKeys.map((colKey) => {
                    const cellValue = table[rowId]?.[colKey] ?? '';
                    return (
                        <div
                            key={`${rowId}-${colKey}`}
                            style={{
                                width: columnWidths[colKey] || 'auto',
                                borderRight: '1px solid rgba(200,200,200,0.05)',
                                borderBottom: '1px solid #6d6b6b',
                                minHeight: '24px',
                                height: '24px',
                                minWidth: '80px',
                                overflow: 'hidden',
                                boxSizing: 'border-box',
                                fontSize: '0.75rem',
                                cursor: cellValue ? 'pointer' : 'default',
                                padding: '2px 4px',
                            }}
                            onClick={() => cellValue && handleCopyCell(String(cellValue))}
                        >
                            <ReadOnlyTinyBaseCell
                                tableId={internalTableId}
                                rowId={rowId}
                                colKey={colKey}
                            />
                        </div>
                    );
                })}
            </div>
        );
    }, [
        dataRowIds,
        headerKeys,
        table,
        internalTableId,
        handleCopyCell,
        theme.palette.action.hover,
        theme.palette.background.default,
        // Only include columnWidths by reference, not by value
        // This prevents re-rendering when columnWidths changes but dimensions are the same
        Object.keys(columnWidths).length // only re-render if columns are added/removed
    ]);

    return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Search bar */}
            <Box sx={{ display: 'flex', flexDirection: 'row', mb: 1 }}>
                <TextField
                    size="small"
                    placeholder="Search table..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    sx={{
                        width: 200,
                        '& .MuiInputBase-input': {
                            fontSize: '0.75rem'
                        }
                    }}
                    variant="outlined"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ fontSize: '1rem' }} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>
            <TableContainer
                component={Box}
                ref={tableContainerRef}
                sx={{
                    height: '100%',
                    maxHeight: 400,
                    overflow: 'auto',
                    borderRadius: 1,
                    backgroundColor: theme.palette.background.default,
                    '& .MuiTable-root': {
                        borderCollapse: 'separate',
                        borderSpacing: 0
                    },
                    '&::-webkit-scrollbar': {
                        width: '8px',
                        height: '8px',
                    },
                    '&::-webkit-scrollbar-track': {
                        backgroundColor: theme.palette.background.default,
                    },
                    '&::-webkit-scrollbar-thumb': {
                        backgroundColor: theme.palette.divider,
                        borderRadius: '4px',
                    },
                }}
            >
                {isTableEmpty ? (
                    <Box sx={{ p: 3, textAlign: 'center', backgroundColor: theme.palette.background.paper }}>
                        <Typography variant="body1" color="text.secondary">
                            This table has no columns yet. Add data to your spreadsheet and refresh.
                        </Typography>
                    </Box>
                ) : (
                    <Table size="small" sx={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
                        <TableHead>
                            <TableRow
                                ref={headerRowRef}
                                sx={{
                                    backgroundColor: theme.palette.background.paper,
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 1
                                }}
                            >
                                {headerKeys.map((colKey) => (
                                    <TableCell
                                        key={colKey}
                                        className="header-cell"
                                        sx={{
                                            fontWeight: theme.typography.fontWeightBold,
                                            backgroundColor: theme.palette.background.paper,
                                            borderRight: '1px solid rgba(200,200,200,0.1)',
                                            padding: '2px 4px',
                                            minWidth: '80px',
                                            height: '28px',
                                            boxSizing: 'border-box',
                                            fontSize: '0.75rem',
                                        }}
                                    >
                                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                                            {headerRow[colKey]}
                                        </Typography>
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody sx={{ backgroundColor: theme.palette.background.default }}>
                            {/* Virtual table implementation */}
                            <TableRow sx={{ height: `${rowVirtualizer.getTotalSize()}px`, display: 'block' }}>
                                <TableCell sx={{ height: '100%', p: 0, border: 'none' }} colSpan={headerKeys.length}>
                                    <div style={{ height: '100%', position: 'relative', width: '100%' }}>
                                        {rowVirtualizer.getVirtualItems().map(renderVirtualRow)}
                                    </div>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                )}
            </TableContainer>
            {/* Snackbar for copy feedback */}
            <Snackbar
                open={copySnackbarOpen}
                autoHideDuration={2000}
                onClose={handleSnackbarClose}
                message={snackbarMessage}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Box>
    );
});

export default SpreadsheetTable;