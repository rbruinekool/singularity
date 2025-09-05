import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTable, useStore } from 'tinybase/ui-react';
import {
    Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, TextField, Button, Menu, MenuItem,
    Dialog, DialogTitle, DialogContent, DialogActions,
    Typography, Divider, InputAdornment
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SearchIcon from '@mui/icons-material/Search';
import { useTheme } from '@mui/material/styles';
import TinyBaseCell from './tinybase-cell';

interface ManualTableProps {
    tableId: string;
}

const ManualTable: React.FC<ManualTableProps> = React.memo(({ tableId }) => {
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

    // State for Add Column dialog
    const [addColDialogOpen, setAddColDialogOpen] = useState(false);
    const [newColName, setNewColName] = useState('');
    const [colNameError, setColNameError] = useState('');

    // State for Column Delete confirmation
    const [deleteColDialogOpen, setDeleteColDialogOpen] = useState(false);
    const [colToDelete, setColToDelete] = useState<string | null>(null);

    // State for row menu
    const [rowMenuAnchorEl, setRowMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [activeRowId, setActiveRowId] = useState<string | null>(null);

    // Search filter state
    const [searchFilter, setSearchFilter] = useState('');

    // Drag and drop state
    const draggedRowIdRef = useRef<string | null>(null);
    const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);

    // Reset drag state when dragging is canceled or completed
    const resetDragState = useCallback(() => {
        draggedRowIdRef.current = null;
        setDragOverRowId(null);
    }, []);

    // Add event listener for dragend
    useEffect(() => {
        const handleDragEnd = () => {
            resetDragState();
        };

        document.addEventListener('dragend', handleDragEnd);
        return () => {
            document.removeEventListener('dragend', handleDragEnd);
        };
    }, [resetDragState]);

    // Column resize state
    const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>(() => {
        // Try to get column widths from TinyBase first
        const widths: { [key: string]: number } = {};

        if (store && tableId) {
            const savedWidths = store.getCell('DataTables', tableId, 'columnWidths');
            if (savedWidths) {
                try {
                    return JSON.parse(savedWidths as string);
                } catch (e) {
                    console.error('Error parsing column widths:', e);
                }
            }
        }

        // Default all columns to 120px
        headerKeys.forEach(key => {
            widths[key] = 120;
        });

        return widths;
    });

    // References for column resizing
    const resizingCol = useRef<string | null>(null);
    const startX = useRef<number>(0);
    const startWidth = useRef<number>(0);

    // Initialize the table structure if needed
    useEffect(() => {
        if (store && internalTableId) {
            // Create the headers row if it doesn't exist
            if (!store.hasRow(internalTableId, '__headers__')) {
                store.setRow(internalTableId, '__headers__', {});
            }
        }
    }, [store, internalTableId]);

    // Save column widths to TinyBase when they change
    useEffect(() => {
        if (store && tableId && Object.keys(columnWidths).length > 0) {
            store.setCell('DataTables', tableId, 'columnWidths', JSON.stringify(columnWidths));
        }
    }, [columnWidths, store, tableId]);

    // Open Add Column dialog
    const handleAddColClick = () => {
        setAddColDialogOpen(true);
        setNewColName('');
        setColNameError('');
    };

    // Add a column with validation
    const handleAddColSubmit = () => {
        const trimmedName = newColName.trim();

        if (!trimmedName) {
            setColNameError('Column name cannot be empty');
            return;
        }

        if (headerKeys.includes(trimmedName)) {
            setColNameError('Column name already exists');
            return;
        }

        if (store && internalTableId) {
            store.transaction(() => {
                // Add header
                store.setCell(internalTableId, '__headers__', trimmedName, trimmedName);

                // Add empty value to all existing rows
                const rowIds = store?.getRowIds(internalTableId) || [];
                rowIds.forEach(rowId => {
                    if (rowId !== '__headers__') {
                        store.setCell(internalTableId, rowId, trimmedName, '');
                    }
                });
            });

            // Set default width for the new column
            setColumnWidths(prev => ({
                ...prev,
                [trimmedName]: 120
            }));
        }

        setAddColDialogOpen(false);
        setNewColName('');
    };

    // Delete a column with confirmation
    const handleDeleteCol = (colKey: string) => {
        setColToDelete(colKey);
        setDeleteColDialogOpen(true);
    };

    const confirmDeleteCol = () => {
        if (store && internalTableId && colToDelete) {
            store.transaction(() => {
                // Remove header
                store.delCell(internalTableId, '__headers__', colToDelete);

                const rowIds = store?.getRowIds(internalTableId) || [];

                // Remove column from all rows
                rowIds.forEach(rowId => {
                    if (rowId !== '__headers__') {
                        store.delCell(internalTableId, rowId, colToDelete);
                    }
                });
            });

            // Remove column width
            setColumnWidths(prev => {
                const newWidths = { ...prev };
                delete newWidths[colToDelete];
                return newWidths;
            });
        }

        setDeleteColDialogOpen(false);
        setColToDelete(null);
    };

    // Add row: create a new row with empty cells for each header
    const addRow = () => {
        if (!store || !internalTableId || headerKeys.length === 0) return;

        // Create row data with empty cells for each column
        const rowData: Record<string, string> = {};
        headerKeys.forEach(key => {
            rowData[key] = '';
        });

        const rowIds = store?.getRowIds(internalTableId) || [];

        // Find the highest existing $order value and add 1
        const filteredRowIds = rowIds.filter(rowId => rowId !== '__headers__');
        let maxOrder = -1;
        filteredRowIds.forEach(rowId => {
            const orderValue = Number(table[rowId]?.['$order'] ?? -1);
            if (orderValue > maxOrder) {
                maxOrder = orderValue;
            }
        });

        // Set $order to the next sequential value
        rowData['$order'] = String(maxOrder + 1);

        store.addRow(internalTableId, rowData);
    };

    // Renumber all rows' $order property sequentially
    const renumberRows = useCallback(() => {
        if (!store || !internalTableId) return;

        const rowIds = store?.getRowIds(internalTableId) || [];

        // Get all rows except headers
        const filteredRowIds = rowIds.filter(rowId => rowId !== '__headers__');

        // Sort by current $order
        const sortedRowIds = [...filteredRowIds].sort((a, b) => {
            const orderA = Number(table[a]?.['$order'] ?? 0);
            const orderB = Number(table[b]?.['$order'] ?? 0);
            return orderA - orderB;
        });

        // Reassign $order values sequentially
        store.transaction(() => {
            sortedRowIds.forEach((rowId, index) => {
                store.setCell(internalTableId, rowId, '$order', String(index));
            });
        });
    }, [store, internalTableId, table]);

    // Remove row
    const handleRowDelete = (rowId: string) => {
        if (store && internalTableId) {
            store.delRow(internalTableId, rowId);
            renumberRows();
        }
    };

    // Duplicate row
    const handleRowDuplicate = (rowId: string) => {
        if (!store || !internalTableId) return;

        // Get the row data to duplicate
        const rowData = { ...table[rowId] };

        // Get the current order of the row
        const currentOrder = Number(rowData['$order'] ?? 0);

        // Remove any system properties
        delete rowData['id'];

        const rowIds = store?.getRowIds(internalTableId) || [];

        // Get all rows except headers
        const filteredRowIds = rowIds.filter(rid => rid !== '__headers__');

        // Find the rows with order greater than the current row
        const rowsToShift = filteredRowIds.filter(rid => {
            const orderValue = Number(table[rid]?.['$order'] ?? 0);
            return orderValue > currentOrder;
        });

        // Make space for the new row by incrementing the order of all rows after this one
        store.transaction(() => {
            // Update all rows with order greater than the current row
            rowsToShift.forEach(rid => {
                const orderValue = Number(table[rid]?.['$order'] ?? 0);
                store.setCell(internalTableId, rid, '$order', String(orderValue + 1));
            });

            // Set the new row's order to be right after the duplicated row
            rowData['$order'] = String(currentOrder + 1);

            // Add the duplicate row
            store.addRow(internalTableId, rowData);
        });
    };

    // Drag and drop handling for row reordering
    const handleDragStart = (e: React.DragEvent, rowId: string) => {
        e.stopPropagation();
        draggedRowIdRef.current = rowId;

        // Set drag effect and data transfer
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', rowId);

            // For better visuals, we can set the row element itself as the drag image
            const row = e.currentTarget as HTMLElement;
            if (row) {
                // Adjust position to center it on the mouse
                const offsetX = e.clientX - row.getBoundingClientRect().left;
                e.dataTransfer.setDragImage(row, offsetX, 10);
            }
        }
    };

    const handleDragOver = (e: React.DragEvent, rowId: string) => {
        e.preventDefault(); // This is critical for drop to work
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        setDragOverRowId(rowId);
    };
    3
    const handleDrop = (e: React.DragEvent, targetRowId: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (!store || !internalTableId) {
            resetDragState();
            return;
        }

        const draggedRowId = draggedRowIdRef.current;
        if (!draggedRowId || draggedRowId === targetRowId) {
            resetDragState();
            return;
        }

        // Get all rows and sort by order
        const rowIds = store.getRowIds(internalTableId) || [];
        const filteredRowIds = rowIds.filter(rowId => rowId !== '__headers__');

        const sortedRowIds = [...filteredRowIds].sort((a, b) => {
            const orderA = Number(table[a]?.['$order'] ?? 0);
            const orderB = Number(table[b]?.['$order'] ?? 0);
            return orderA - orderB;
        });

        // Find the indices in the sorted array
        const fromIndex = sortedRowIds.indexOf(draggedRowId);
        const toIndex = sortedRowIds.indexOf(targetRowId);

        if (fromIndex === -1 || toIndex === -1) {
            resetDragState();
            return;
        }

        // Reorder the rows
        sortedRowIds.splice(fromIndex, 1);
        sortedRowIds.splice(toIndex, 0, draggedRowId);

        // Update the $order values
        store.transaction(() => {
            sortedRowIds.forEach((rowId, index) => {
                store.setCell(internalTableId, rowId, '$order', String(index));
            });
        });

        // Reset drag state
        resetDragState();
    };

    // Column resize handlers
    const handleColumnResizeStart = (colKey: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        resizingCol.current = colKey;
        startX.current = e.clientX;
        startWidth.current = columnWidths[colKey] || 120;

        document.addEventListener('mousemove', handleColumnResizeMove);
        document.addEventListener('mouseup', handleColumnResizeEnd);
    };

    const handleColumnResizeMove = (e: MouseEvent) => {
        if (!resizingCol.current) return;

        // Only update if the change is significant enough (prevents micro-updates)
        if (Math.abs(e.clientX - startX.current) > 1) {
            const colKey = resizingCol.current;
            const delta = e.clientX - startX.current;
            const newWidth = Math.max(40, startWidth.current + delta); // Minimum width of 40px

            // Only update the specific column being resized
            setColumnWidths(prev => ({
                ...prev,
                [colKey]: newWidth
            }));
        }
    };

    const handleColumnResizeEnd = () => {
        resizingCol.current = null;
        document.removeEventListener('mousemove', handleColumnResizeMove);
        document.removeEventListener('mouseup', handleColumnResizeEnd);
    };

    // Row menu controls
    const handleRowMenuOpen = (event: React.MouseEvent<HTMLElement>, rowId: string) => {
        setRowMenuAnchorEl(event.currentTarget);
        setActiveRowId(rowId);
    };

    const handleRowMenuClose = () => {
        setRowMenuAnchorEl(null);
        setActiveRowId(null);
    };

    // Get a sorted and filtered list of row IDs, filtering out the headers row
    const sortedRowIds = useMemo(() => {
        if (!store || !internalTableId) return [];

        const rowIds = store.getRowIds(internalTableId) || [];
        let filteredRowIds = rowIds.filter(rowId => rowId !== '__headers__');

        // Apply search filter
        if (searchFilter.trim()) {
            const searchTerm = searchFilter.toLowerCase();
            filteredRowIds = filteredRowIds.filter(rowId => {
                // Check if any cell in the row contains the search term
                const rowData = table[rowId] || {};
                return headerKeys.some(colKey => {
                    const cellValue = String(rowData[colKey] || '').toLowerCase();
                    return cellValue.includes(searchTerm);
                });
            });
        }

        return filteredRowIds.sort((a, b) => {
            const orderA = Number(table[a]?.['$order'] ?? 0);
            const orderB = Number(table[b]?.['$order'] ?? 0);
            return orderA - orderB;
        });
    }, [store, internalTableId, table, searchFilter, headerKeys]);

    return (
        <Box>
            <Box sx={{ display: 'flex', flexDirection: 'row' }}>
                <Box sx={{ mb: 1, display: 'flex', gap: 1 }}>
                    <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={addRow}
                        variant="outlined"
                        color="primary"
                        disabled={headerKeys.length === 0}
                        sx={{ fontSize: '0.5rem' }}
                    >
                        Row
                    </Button>
                    <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={handleAddColClick}
                        variant="outlined"
                        color="primary"
                        sx={{ fontSize: '0.5rem' }}
                    >
                        Column
                    </Button>
                </Box>
                {/* Search filter */}
                <Box sx={{ mb: 1, marginLeft: 2 }}>
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

            </Box>
            {/* Action buttons */}

            {/* Info message when no columns */}
            {headerKeys.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center', backgroundColor: theme.palette.background.paper }}>
                    <Typography variant="body1" color="text.secondary">
                        This table has no columns yet. Click "Add Column" to create your first column.
                    </Typography>
                </Box>
            ) : (
                /* Table with data */
                <TableContainer component={Box} sx={{
                    maxHeight: 400,
                    overflow: 'auto',
                    '& .MuiTable-root': {
                        borderCollapse: 'separate',
                        borderSpacing: 0
                    }
                }}>
                    <Table size="small" sx={{ tableLayout: 'fixed', width: 'max-content' }}>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: theme.palette.background.paper }}>
                                {/* Row controls column */}
                                <TableCell
                                    sx={{
                                        width: '60px',
                                        minWidth: '60px',
                                        maxWidth: '60px',
                                        backgroundColor: theme.palette.background.paper,
                                        padding: '2px',
                                        textAlign: 'center',
                                        height: '28px',
                                        borderRight: '1px solid rgba(200,200,200,0.1)'
                                    }}
                                >
                                </TableCell>

                                {/* Data columns */}
                                {headerKeys.map((colKey) => (
                                    <TableCell
                                        key={colKey}
                                        sx={{
                                            fontWeight: theme.typography.fontWeightBold,
                                            backgroundColor: theme.palette.background.paper,
                                            borderRight: '1px solid rgba(200,200,200,0.1)',
                                            padding: '2px 4px',
                                            position: 'relative',
                                            width: `${columnWidths[colKey] || 120}px`,
                                            minWidth: `${columnWidths[colKey] || 120}px`,
                                            maxWidth: `${columnWidths[colKey] || 120}px`,
                                            height: '28px',
                                            boxSizing: 'border-box'
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                                                {headerRow[colKey]}
                                            </Typography>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDeleteCol(colKey)}
                                                sx={{ p: 0.25 }}
                                            >
                                                <DeleteIcon fontSize="inherit" sx={{ fontSize: 14 }} />
                                            </IconButton>
                                        </Box>

                                        {/* Column resize handle */}
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                right: -4,
                                                top: 0,
                                                width: 8,
                                                height: '100%',
                                                cursor: 'col-resize',
                                                zIndex: 100,
                                                '&:hover': {
                                                    backgroundColor: theme.palette.primary.light,
                                                    opacity: 0.4
                                                },
                                                '&:active': {
                                                    backgroundColor: theme.palette.primary.main,
                                                    opacity: 0.6
                                                },
                                                '&::after': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    right: 3,
                                                    top: 0,
                                                    width: 2,
                                                    height: '100%',
                                                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                                }
                                            }}
                                            onMouseDown={(e) => handleColumnResizeStart(colKey, e)}
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>

                        <TableBody sx={{ backgroundColor: theme.palette.background.default }}>
                            {/* Map through rows, filtered and sorted by $order */}
                            {sortedRowIds.map((rowId, index) => (
                                <TableRow
                                    key={rowId}
                                    sx={{
                                        minHeight: '20px',
                                        height: '20px',
                                        backgroundColor: rowId === dragOverRowId
                                            ? theme.palette.action.selected
                                            : 'inherit',
                                        '&:hover': {
                                            backgroundColor: theme.palette.action.hover
                                        },
                                        transition: 'background-color 0.2s',
                                        cursor: 'grab',
                                        // Add a drop indicator line
                                        ...(rowId === dragOverRowId && {
                                            position: 'relative',
                                            '&::before': {
                                                content: '""',
                                                position: 'absolute',
                                                left: 0,
                                                right: 0,
                                                top: 0,
                                                height: '2px',
                                                backgroundColor: theme.palette.primary.main,
                                                zIndex: 1
                                            }
                                        })
                                    }}
                                    draggable={true}
                                    onDragStart={(e) => handleDragStart(e, rowId)}
                                    onDragOver={(e) => {
                                        handleDragOver(e, rowId);
                                    }}
                                    onDragEnter={(e) => {
                                        e.preventDefault();
                                        setDragOverRowId(rowId);
                                    }}
                                    onDragLeave={(e) => {
                                        e.preventDefault();
                                        if (dragOverRowId === rowId) {
                                            setDragOverRowId(null);
                                        }
                                    }}
                                    onDrop={(e) => {
                                        handleDrop(e, rowId);
                                    }}
                                >
                                    {/* Row controls */}
                                    <TableCell
                                        sx={{
                                            width: '60px',
                                            minWidth: '60px',
                                            maxWidth: '60px',
                                            textAlign: 'center',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderBottom: '1px solid rgba(109, 107, 107, 1)',
                                            height: '20px'
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                cursor: 'grab',
                                                '&:active': { cursor: 'grabbing' },
                                                '&:hover': {
                                                    backgroundColor: theme.palette.action.hover,
                                                    borderRadius: '4px'
                                                },
                                                padding: '0 4px'
                                            }}
                                        >
                                            <DragIndicatorIcon sx={{ fontSize: 14, mr: 0.5, color: theme.palette.text.secondary }} />
                                            <Typography variant="body2" sx={{
                                                color: theme.palette.text.secondary,
                                                mr: 0.5,
                                                fontSize: 12,
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}>
                                                {index + 1}
                                            </Typography>
                                            <IconButton
                                                size="small"
                                                onClick={(e) => handleRowMenuOpen(e, rowId)}
                                                sx={{ p: 0, minWidth: 20, height: 20 }}
                                            >
                                                <MoreVertIcon fontSize="inherit" sx={{ fontSize: 16 }} />
                                            </IconButton>
                                        </Box>
                                    </TableCell>

                                    {/* Data cells */}
                                    {headerKeys.map((colKey) => (
                                        <TableCell
                                            key={colKey}
                                            sx={{
                                                padding: '1px 2px',
                                                borderLeft: '1px solid rgba(200,200,200,0.05)',
                                                borderBottom: '1px solid rgba(109, 107, 107, 1)',
                                                minHeight: '20px',
                                                height: '20px',
                                                width: `${columnWidths[colKey] || 120}px`,
                                                minWidth: `${columnWidths[colKey] || 120}px`,
                                                maxWidth: `${columnWidths[colKey] || 120}px`,
                                                overflow: 'hidden',
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            <TinyBaseCell
                                                tableId={internalTableId}
                                                rowId={rowId}
                                                colKey={colKey}
                                            />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Add Column Dialog */}
            <Dialog open={addColDialogOpen} onClose={() => setAddColDialogOpen(false)}>
                <DialogTitle>Add Column</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Column Name"
                        fullWidth
                        value={newColName}
                        onChange={(e) => {
                            setNewColName(e.target.value);
                            setColNameError('');

                            // Validate as user types
                            const trimmed = e.target.value.trim();
                            if (trimmed && headerKeys.includes(trimmed)) {
                                setColNameError('Column name already exists');
                            }
                        }}
                        error={!!colNameError}
                        helperText={colNameError || 'Columns cannot be renamed after creation'}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !colNameError && newColName.trim()) {
                                handleAddColSubmit();
                            }
                            if (e.key === 'Escape') {
                                setAddColDialogOpen(false);
                            }
                        }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        Note: Columns cannot be moved or renamed after they are created, though they can be deleted.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddColDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleAddColSubmit}
                        disabled={!!colNameError || !newColName.trim()}
                        variant="contained"
                    >
                        Add
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Column Confirmation */}
            <Dialog open={deleteColDialogOpen} onClose={() => setDeleteColDialogOpen(false)}>
                <DialogTitle>Delete Column</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete the column "{colToDelete ? headerRow[colToDelete] : ''}"?
                    </Typography>
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                        This action cannot be undone and will delete all data in this column.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteColDialogOpen(false)}>Cancel</Button>
                    <Button onClick={confirmDeleteCol} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Row Options Menu */}
            <Menu
                anchorEl={rowMenuAnchorEl}
                open={Boolean(rowMenuAnchorEl)}
                onClose={handleRowMenuClose}
            >
                <MenuItem
                    onClick={() => {
                        if (activeRowId) {
                            handleRowDuplicate(activeRowId);
                            handleRowMenuClose();
                        }
                    }}
                >
                    Duplicate Row
                </MenuItem>
                <Divider />
                <MenuItem
                    onClick={() => {
                        if (activeRowId) {
                            handleRowDelete(activeRowId);
                            handleRowMenuClose();
                        }
                    }}
                    sx={{ color: 'error.main' }}
                >
                    Delete Row
                </MenuItem>
            </Menu>
        </Box>
    );
});

export default ManualTable;
