import React, { useState, useRef, useMemo, useCallback } from 'react';
import { IconButton, TextField, Autocomplete, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useTheme } from '@mui/material/styles';
import { useAddRowCallback, useStore, useTable, useDelRowCallback, useRowIds } from 'tinybase/ui-react';
import { Subcomposition, SingularModel } from '../../../shared/singular/interfaces/singular-model';
import { RundownRow } from '../../../shared/store/interfaces/rundown-row';
import { ConnectionRow } from '../../../shared/store/interfaces/connection-row';
import RundownRowComponent from './rundown-row';
import FilteredSortedTableView from './components/filtered-sorted-table-view';

interface RundownProps {
    rundownId?: string;
    selectedRowId?: string | null;
    onRowSelect?: (rowId: string) => void;
    onRowDelete?: (rowId: string) => void;
}

const Rundown: React.FC<RundownProps> = ({ rundownId = 'rundown-1', selectedRowId, onRowSelect, onRowDelete }) => {
    const theme = useTheme();
    const [openAutocomplete, setOpenAutocomplete] = useState(false);
    type ExtendedSubcomposition = Subcomposition & { appToken: string; appLabel: string; connectionLabel: string };
    const [selectedSubcomposition, setSelectedSubcomposition] = useState<ExtendedSubcomposition | null>(null);
    const [columnWidths, setColumnWidths] = useState(() => {
        const saved = localStorage.getItem('columnWidths');
        const defaultWidths = [30, 60, 60, 120, 120, 30];
        
        if (saved) {
            try {
                const parsedWidths = JSON.parse(saved);
                // If saved widths don't match expected column count, use defaults
                if (parsedWidths.length !== 6) {
                    console.log('Column count mismatch, using default widths');
                    return defaultWidths;
                }
                return parsedWidths;
            } catch {
                return defaultWidths;
            }
        }
        return defaultWidths;
    });

    const resizingCol = useRef<number | null>(null);
    const startX = useRef<number>(0);
    const startWidths = useRef<number[]>([]);
    const autocompleteRef = useRef<HTMLDivElement>(null);

    const draggedRowIdRef = useRef<string | null>(null);
    const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const store = useStore();
    if (!store) return <p>No store available</p>;

    // TinyBase hooks for efficient operations
    const rundownTableRowIds = useRowIds('rundown-1');
    const rundownTable = useTable('rundown-1');

    // Create a callback for batch reordering operations
    const updateRowOrders = useCallback((reorderedRowIds: string[]) => {
        if (!store) return;

        // Use a transaction for batch updates to ensure atomicity
        store.transaction(() => {
            reorderedRowIds.forEach((rowId, idx) => {
                store.setCell('rundown-1', rowId, 'order', idx);
            });
        });
    }, [store]);

    const handleAddClick = () => {
        setOpenAutocomplete((prev) => !prev);
    };

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        setMenuAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
    };

    const handleDeleteRundownClick = () => {
        setMenuAnchorEl(null);
        setDeleteDialogOpen(true);
    };

    const handleDeleteDialogClose = () => {
        setDeleteDialogOpen(false);
    };

    // Use TinyBase hook to delete rundown from rundowns table
    const deleteRundownCallback = useDelRowCallback(
        'rundowns',
        rundownId,
        undefined,
        () => {
            // After successful deletion, close the dialog
            setDeleteDialogOpen(false);
        }
    );

    const handleDeleteRundownConfirm = useCallback(() => {
        if (!store || !rundownTableRowIds) return;

        // Delete all rows for the active rundown from rundown-1 table
        store.transaction(() => {
            rundownTableRowIds.forEach(rowId => {
                const rowRundownId = rundownTable?.[rowId]?.rundownId;
                if (rowRundownId === rundownId) {
                    store.delRow('rundown-1', rowId);
                }
            });
        });

        // Delete the rundown itself from the rundowns table
        deleteRundownCallback();
    }, [store, rundownId, deleteRundownCallback, rundownTableRowIds, rundownTable]);

    // Create a callback for incrementing row orders from a specific position
    const incrementRowOrdersFromPosition = useCallback((fromOrder: number) => {
        if (!store || !rundownTableRowIds) return;

        store.transaction(() => {
            rundownTableRowIds.forEach((rowId) => {
                const currentOrder = rundownTable?.[rowId]?.order;
                const rowRundownId = rundownTable?.[rowId]?.rundownId;
                if (typeof currentOrder === 'number' && currentOrder > fromOrder && rowRundownId === rundownId) {
                    store.setCell('rundown-1', rowId, 'order', currentOrder + 1);
                }
            });
        });
    }, [store, rundownId, rundownTableRowIds, rundownTable]);

    // Create a callback for incrementing existing row orders (legacy for top insertion)
    const incrementExistingRowOrders = useCallback(() => {
        incrementRowOrdersFromPosition(-1); // -1 means increment all rows (insert at top)
    }, [incrementRowOrdersFromPosition]);

    const handleAddRow = useAddRowCallback(
        'rundown-1',
        (subComp: ExtendedSubcomposition) => {
            // Determine where to insert the new row
            let insertOrder = 0; // Default to top
            
            if (selectedRowId) {
                const selectedRowOrder = rundownTable?.[selectedRowId]?.order;
                if (typeof selectedRowOrder === 'number') {
                    insertOrder = selectedRowOrder + 1;
                    incrementRowOrdersFromPosition(selectedRowOrder);
                } else {
                    incrementExistingRowOrders();
                }
            } else {
                incrementExistingRowOrders();
            }

            // Create payload from model defaults
            const payload: { [key: string]: number | string | boolean } = {};
            if (Array.isArray(subComp.model)) {
                subComp.model.forEach((item: { id: string; defaultValue: any }) => {
                    payload[item.id] = item.defaultValue;
                });
            }

            // Return TinyBase Row structure (not RundownRow interface)
            return {
                subCompositionId: subComp.id,
                subCompositionName: subComp.name,
                state: 'Out1',
                logicLayer: JSON.stringify(subComp.logicLayer), // Stringify complex objects for TinyBase
                payload: JSON.stringify(payload), // Stringify payload object
                appToken: subComp.appToken,
                name: subComp.name,
                rundownId: rundownId, // Keep as string, don't parseInt
                type: 'subcomposition',
                order: insertOrder,
                appLabel: subComp.appLabel,
                update: Date.now()
            };
        },
        [incrementExistingRowOrders, incrementRowOrdersFromPosition, selectedRowId, rundownTable, rundownId],
        undefined,
        () => { setOpenAutocomplete(false); setSelectedSubcomposition(null); },
        [setOpenAutocomplete, incrementExistingRowOrders, incrementRowOrdersFromPosition, selectedRowId, rundownId]
    );

    const handleMouseDown = (colIdx: number, e: React.MouseEvent) => {
        resizingCol.current = colIdx;
        startX.current = e.clientX;
        startWidths.current = [...columnWidths];
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (resizingCol.current !== null && resizingCol.current < columnWidths.length - 1) {
            const deltaX = e.clientX - startX.current;
            const leftCol = resizingCol.current;
            const rightCol = leftCol + 1;
            const minWidth = 40;
            
            // Calculate new widths without clamping first
            let newLeftWidth = startWidths.current[leftCol] + deltaX;
            let newRightWidth = startWidths.current[rightCol] - deltaX;
            
            // Check if either column would go below minimum width
            if (newLeftWidth < minWidth || newRightWidth < minWidth) {
                // Stop the drag operation completely to prevent cascading effects
                return;
            }
            
            // Update the widths since both are above minimum
            const newWidths = [...startWidths.current];
            newWidths[leftCol] = newLeftWidth;
            newWidths[rightCol] = newRightWidth;
            setColumnWidths(newWidths);
            localStorage.setItem('columnWidths', JSON.stringify(newWidths));
        }
    };

    const handleMouseUp = () => {
        resizingCol.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    // Drag-and-drop logic for reordering rows (only within the same rundown)
    const moveRow = useCallback((fromRowId: string, toRowId: string) => {
        if (!store || !rundownTableRowIds) return;
        if (fromRowId === toRowId) return;

        // Get all rows for this rundown and sort by order
        const rowIds = rundownTableRowIds.filter(rowId => 
            rundownTable?.[rowId]?.rundownId === rundownId
        );
        
        rowIds.sort((a, b) => {
            const orderA = rundownTable?.[a]?.order ?? 0;
            const orderB = rundownTable?.[b]?.order ?? 0;
            if (typeof orderA !== 'number' || typeof orderB !== 'number') {
                return 0; // If order is not a number, keep original order
            }
            return orderA - orderB;
        });

        // Store original indices
        const fromIndex = rowIds.indexOf(fromRowId);
        const origToIndex = rowIds.indexOf(toRowId);
        // Remove the dragged row
        rowIds.splice(fromIndex, 1);
        let toIndex = rowIds.indexOf(toRowId);
        // If dragging down, insert after the target
        if (fromIndex < origToIndex) toIndex++;
        rowIds.splice(toIndex, 0, fromRowId);

        // Use the callback for batch updates
        updateRowOrders(rowIds);
    }, [store, updateRowOrders, rundownId, rundownTableRowIds, rundownTable]);

    // Get connections table with proper typing
    const connectionsTable = useTable('connections');

    // Create autocomplete options from connections
    const autocompleteOptions = useMemo(() => {
        if (!connectionsTable) return [];

        const options: ExtendedSubcomposition[] = [];

        Object.entries(connectionsTable).forEach(([rowId, connectionRow]) => {
            try {
                const connectionData = connectionRow as any;
                const { label, appToken, model: modelString } = connectionData;

                if (label && appToken && modelString) {
                    const model: SingularModel = JSON.parse(modelString);
                    
                    model.subcompositions.forEach(subComp => {
                        options.push({
                            ...subComp,
                            appToken,
                            appLabel: label,
                            connectionLabel: label
                        });
                    });
                }
            } catch (error) {
                console.error(`Error parsing model for connection ${rowId}:`, error);
            }
        });

        return options;
    }, [connectionsTable]);


    const dragBoxSx = { position: 'absolute', right: '-5px', top: 0, bottom: 0, width: '10px', cursor: 'col-resize', zIndex: 1 }

    return (
        <Box position="relative">
            <TableContainer component={Paper}>
                <Table 
                    size="small" 
                    sx={{ 
                        tableLayout: 'fixed',
                        width: '100%'
                    }}
                >
                    <TableHead>
                        <TableRow sx={{ backgroundColor: theme.palette.background.paper }}>
                            <TableCell sx={{ padding: '4px', width: columnWidths[0], position: 'relative', textAlign: 'center' }}>
                                <IconButton color="primary" onClick={handleAddClick} size="small">
                                    <AddIcon fontSize="small" />
                                </IconButton>
                            </TableCell>
                            <TableCell sx={{ padding: '4px', width: columnWidths[1], borderRight: '1px solid rgba(200, 200, 200, 0.1)', position: 'relative', fontWeight: theme.typography.fontWeightBold }}>
                                Controls
                                <Box sx={dragBoxSx}
                                    onMouseDown={(e) => handleMouseDown(1, e)} />
                            </TableCell>
                            <TableCell sx={{ padding: '4px', width: columnWidths[2], borderRight: '1px solid rgba(200, 200, 200, 0.1)', position: 'relative', fontWeight: theme.typography.fontWeightBold }}>
                                Name
                                <Box sx={dragBoxSx}
                                    onMouseDown={(e) => handleMouseDown(2, e)} />
                            </TableCell>
                            <TableCell sx={{ padding: '4px', width: columnWidths[3], borderRight: '1px solid rgba(200, 200, 200, 0.1)', position: 'relative', fontWeight: theme.typography.fontWeightBold }}>
                                App
                                <Box sx={dragBoxSx}
                                    onMouseDown={(e) => handleMouseDown(3, e)} />
                            </TableCell>
                            <TableCell sx={{ padding: '4px', width: columnWidths[4], borderRight: '1px solid rgba(200, 200, 200, 0.1)', position: 'relative', fontWeight: theme.typography.fontWeightBold }}>
                                Template
                                <Box sx={dragBoxSx}
                                    onMouseDown={(e) => handleMouseDown(4, e)} />
                            </TableCell>
                            <TableCell sx={{ padding: '4px', width: columnWidths[5], position: 'relative', fontWeight: theme.typography.fontWeightBold }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    Layer
                                    <IconButton
                                        size="small"
                                        onClick={handleMenuClick}
                                        sx={{ ml: 1 }}
                                    >
                                        <MoreVertIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                                {/* No resize handle for last column */}
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody sx={{ backgroundColor: theme.palette.background.default }}>
                        <FilteredSortedTableView
                            tableId={'rundown-1'}
                            cellId={'order'}
                            filterRundownId={rundownId}
                            rowComponent={(props) => (
                                <RundownRowComponent
                                    {...props}
                                    columnWidths={columnWidths}
                                    tableId="rundown-1"
                                    selectedRowId={selectedRowId}
                                    onRowSelect={onRowSelect}
                                    onRowDelete={onRowDelete}
                                    onDragStart={(rowId) => { draggedRowIdRef.current = rowId; }}
                                    onDragOver={setDragOverRowId}
                                    onDrop={(targetRowId) => {
                                        if (draggedRowIdRef.current) {
                                            moveRow(draggedRowIdRef.current, targetRowId);
                                            draggedRowIdRef.current = null;
                                            setDragOverRowId(null);
                                        }
                                    }}
                                    isDragOver={props.rowId === dragOverRowId}
                                />
                            )}
                        />
                    </TableBody>
                </Table>
            </TableContainer>
            {openAutocomplete && (
                <Box
                    ref={autocompleteRef}
                    sx={{
                        position: 'absolute',
                        top: '42px',
                        left: '0px',
                        zIndex: 10,
                        backgroundColor: theme.palette.background.paper,
                        boxShadow: theme.shadows[3],
                        p: 1,
                        width: '300px',
                        border: '1px solid #ccc',
                    }}
                >
                    <Autocomplete
                        options={autocompleteOptions}
                        groupBy={(option) => option.connectionLabel}
                        getOptionLabel={(option) => option.name}
                        renderInput={(params) => (
                            <TextField {...params} label="Select Subcomposition" variant="outlined" size="small" />
                        )}
                        onChange={(event, value) => {
                            if (value) {
                                setSelectedSubcomposition(value);
                                handleAddRow(value);
                            }
                        }}
                        onBlur={() => {
                            setOpenAutocomplete(false);
                        }}
                        disableCloseOnSelect={false}
                        value={selectedSubcomposition}
                        isOptionEqualToValue={(option, value) => option.id === value?.id}
                        renderGroup={(params) => (
                            <li key={params.key}>
                                <Box sx={{
                                    fontWeight: 'bold',
                                    color: theme.palette.primary.main,
                                    padding: '8px 16px',
                                    backgroundColor: theme.palette.background.default
                                }}>
                                    {params.group}
                                </Box>
                                <ul style={{ padding: 0 }}>{params.children}</ul>
                            </li>
                        )}
                    />
                </Box>
            )}

            {/* Menu for more options */}
            <Menu
                anchorEl={menuAnchorEl}
                open={Boolean(menuAnchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={handleDeleteRundownClick} sx={{ color: 'error.main' }}>
                    Delete Rundown
                </MenuItem>
            </Menu>

            {/* Delete confirmation dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={handleDeleteDialogClose}
            >
                <DialogTitle>Delete Rundown</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ fontSize: '0.875rem' }}>
                            Are you sure you want to irreversibly delete the entire rundown?
                            <span>This action cannot be undone and will</span>
                        <span style={{ color: 'error.main'}}> irreversibly remove all items</span> from the rundown!
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDeleteDialogClose}>Cancel</Button>
                    <Button onClick={handleDeleteRundownConfirm} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Rundown;