import React, { useState, useRef, useMemo, useCallback } from 'react';
import { IconButton, TextField, Autocomplete, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useTheme } from '@mui/material/styles';
import { useAddRowCallback, useStore, SortedTableView, useTable, useSetPartialRowCallback } from 'tinybase/ui-react';
import { Subcomposition, SingularModel } from '../../../shared/singular/interfaces/singular-model';
import RundownRow from './rundown-row';

interface RundownSubcomposition {
    id: string;
    name: string;
    state: string;
    appToken: string;
    appLabel: string;
    logicLayer: { name: string; tag: string };
}

interface RundownProps {
    selectedRowId?: string | null;
    onRowSelect?: (rowId: string) => void;
    onRowDelete?: (rowId: string) => void;
}

const Rundown: React.FC<RundownProps> = ({ selectedRowId, onRowSelect, onRowDelete }) => {
    const theme = useTheme();
    const [openAutocomplete, setOpenAutocomplete] = useState(false);
    const [selectedSubcomposition, setSelectedSubcomposition] = useState<{
        id: string;
        name: string;
        connectionLabel: string;
        appToken: string;
        fullSubcomposition: Subcomposition | null;
    } | null>(null);
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

    const handleDeleteRundownConfirm = useCallback(() => {
        if (!store) return;

        // Delete all rows in the rundown-1 table
        store.transaction(() => {
            const rowIds = store.getRowIds('rundown-1');
            rowIds.forEach((rowId) => {
                store.delRow('rundown-1', rowId);
            });
        });

        setDeleteDialogOpen(false);
    }, [store]);

    // Create a callback for incrementing existing row orders
    const incrementExistingRowOrders = useCallback(() => {
        if (!store) return;

        store.transaction(() => {
            const rowIds = store.getRowIds('rundown-1');
            rowIds.forEach((rowId) => {
                const currentOrder = store.getCell('rundown-1', rowId, 'order');
                if (typeof currentOrder === 'number') {
                    store.setCell('rundown-1', rowId, 'order', currentOrder + 1);
                }
            });
        });
    }, [store]);

    const handleSubcompositionSelect = useAddRowCallback(
        'rundown-1',
        (subComp: RundownSubcomposition) => {
            // First increment existing row orders
            incrementExistingRowOrders();

            //The row that is added to the rundown table
            return {
                status: subComp.state || 'Out1',
                layer: subComp.logicLayer.name || 'default',
                name: subComp.name,
                template: subComp.name,
                type: 'subcomposition',
                subcompId: subComp.id,
                appToken: subComp.appToken,
                appLabel: subComp.appLabel,
                order: 0,
            };
        },
        [incrementExistingRowOrders],
        undefined,
        () => { setOpenAutocomplete(false); setSelectedSubcomposition(null); },
        [setOpenAutocomplete, incrementExistingRowOrders]
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

    // Drag-and-drop logic for reordering rows
    const moveRow = useCallback((fromRowId: string, toRowId: string) => {
        if (!store) return;
        if (fromRowId === toRowId) return;

        // Get all rows sorted by order
        const rowIds = store.getRowIds('rundown-1').slice();
        rowIds.sort((a, b) => {
            const orderA = store.getCell('rundown-1', a, 'order') ?? 0;
            const orderB = store.getCell('rundown-1', b, 'order') ?? 0;
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
    }, [store, updateRowOrders]);

    //const subcompositions: Subcomposition[] = data[0]?.subcompositions ? data[0].subcompositions : [];
    const connections = useTable('connections');

    // Create array of subcompositions from connections for autocomplete
    const connectionSubcompositions = useMemo(() => {
        if (!connections) return [];

        const result: Array<{
            label: string;
            appToken: string;
            subcompositions: Array<{ id: string; name: string }>;
        }> = [];

        Object.entries(connections).forEach(([rowId, row]) => {
            try {
                const label = row.label as string;
                const appToken = row.appToken as string;
                const modelString = row.model as string;

                if (label && appToken && modelString) {
                    const model: SingularModel = JSON.parse(modelString);
                    const subcompositions = model.subcompositions.map(sub => ({
                        id: sub.id,
                        name: sub.name
                    }));

                    if (subcompositions.length > 0) {
                        result.push({
                            label,
                            appToken,
                            subcompositions
                        });
                    }
                }
            } catch (error) {
                console.error(`Error parsing model for connection ${rowId}:`, error);
            }
        });

        return result;
    }, [connections]);

    // Flatten subcompositions for autocomplete with grouping info
    const autocompleteOptions = useMemo(() => {
        const options: Array<{
            id: string;
            name: string;
            connectionLabel: string;
            appToken: string;
            fullSubcomposition: Subcomposition | null;
        }> = [];

        connectionSubcompositions.forEach(connection => {
            connection.subcompositions.forEach(sub => {
                options.push({
                    id: sub.id,
                    name: sub.name,
                    connectionLabel: connection.label,
                    appToken: connection.appToken,
                    fullSubcomposition: null // TODO: Fetch full subcomposition data when needed for detailed operations
                });
            });
        });

        return options;
    }, [connectionSubcompositions]);


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
                        <SortedTableView
                            tableId={'rundown-1'}
                            cellId={'order'}
                            rowComponent={(props) => (
                                <RundownRow
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
                                // TODO: Get actual state, logicLayer from the full subcomposition data instead of defaults
                                const subComp: RundownSubcomposition = {
                                    id: value.id,
                                    name: value.name,
                                    state: 'OFF', // Default state
                                    logicLayer: { name: 'default', tag: 'default' }, // Default logic layer
                                    appToken: value.appToken,
                                    appLabel: value.connectionLabel,
                                };
                                setSelectedSubcomposition(value);
                                handleSubcompositionSelect(subComp);
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