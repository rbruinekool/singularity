import React, { useState, useRef, useMemo } from 'react';
import { IconButton, TextField, Autocomplete, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTheme } from '@mui/material/styles';
import { useAddRowCallback, useStore, SortedTableView, useTable } from 'tinybase/ui-react';
import { Subcomposition, SingularModel } from '../../shared/interfaces/singular-model';
import RundownRow from './rundown-row';

interface RundownSubcomposition {
    id: string;
    name: string;
    state: string;
    appToken: string;
    logicLayer: { name: string; tag: string };
}

const Rundown: React.FC = () => {
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
        return saved ? JSON.parse(saved) : [30, 60, 40, 180, 180];
    });

    const resizingCol = useRef<number | null>(null);
    const startX = useRef<number>(0);
    const startWidths = useRef<number[]>([]);
    const autocompleteRef = useRef<HTMLDivElement>(null);

    const draggedRowIdRef = useRef<string | null>(null);
    const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);

    const store = useStore();
    if (!store) return <p>No store available</p>;

    const handleAddClick = () => {
        setOpenAutocomplete((prev) => !prev);
    };

    const handleSubcompositionSelect = useAddRowCallback(
        'rundown-1',
        (subComp: RundownSubcomposition) => {
            const rowIds = store.getRowIds('rundown-1');
            rowIds.forEach((rowId) => {
                const currentOrder = store.getCell('rundown-1', rowId, 'order');
                if (typeof currentOrder === 'number') {
                    store.setCell('rundown-1', rowId, 'order', currentOrder + 1);
                }
            });

            //The row that is added to the rundown table
            return {
                status: subComp.state || 'Out1',
                layer: subComp.logicLayer.name || 'default',
                name: '',
                template: subComp.name,
                type: 'subcomposition',
                subcompId: subComp.id,
                appToken: subComp.appToken,
                order: 0,
            };
        },
        [],
        undefined,
        () => { setOpenAutocomplete(false); setSelectedSubcomposition(null); },
        [setOpenAutocomplete]
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
            const newWidths = [...startWidths.current];
            const leftCol = resizingCol.current;
            const rightCol = leftCol + 1;
            const minWidth = 40;
            let newLeftWidth = Math.max(minWidth, startWidths.current[leftCol] + deltaX);
            let newRightWidth = Math.max(minWidth, startWidths.current[rightCol] - deltaX);
            // Only update if both columns are above minWidth
            if (newLeftWidth + newRightWidth === startWidths.current[leftCol] + startWidths.current[rightCol]) {
                newWidths[leftCol] = newLeftWidth;
                newWidths[rightCol] = newRightWidth;
                setColumnWidths(newWidths);
                localStorage.setItem('columnWidths', JSON.stringify(newWidths));
            }
        }
    };

    const handleMouseUp = () => {
        resizingCol.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    // Drag-and-drop logic for reordering rows
    const moveRow = (fromRowId: string, toRowId: string) => {
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

        // Reassign order values
        rowIds.forEach((rowId, idx) => {
            store.setCell('rundown-1', rowId, 'order', idx);
        });
    };

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
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: theme.palette.background.paper }}>
                            <TableCell sx={{ padding: '4px', width: columnWidths[0], position: 'relative', textAlign: 'center' }}>
                                <IconButton color="primary" onClick={handleAddClick} size="small">
                                    <AddIcon fontSize="small" />
                                </IconButton>
                            </TableCell>
                            <TableCell sx={{ padding: '4px', width: columnWidths[1], borderRight: '1px solid rgba(200, 200, 200, 0.1)', position: 'relative', fontWeight: theme.typography.fontWeightBold }}>
                                Status
                                <Box sx={dragBoxSx}
                                    onMouseDown={(e) => handleMouseDown(1, e)} />
                            </TableCell>
                            <TableCell sx={{ padding: '4px', width: columnWidths[2], borderRight: '1px solid rgba(200, 200, 200, 0.1)', position: 'relative', fontWeight: theme.typography.fontWeightBold }}>
                                Layer
                                <Box sx={dragBoxSx}
                                    onMouseDown={(e) => handleMouseDown(2, e)} />
                            </TableCell>
                            <TableCell sx={{ padding: '4px', width: columnWidths[3], borderRight: '1px solid rgba(200, 200, 200, 0.1)', position: 'relative', fontWeight: theme.typography.fontWeightBold }}>
                                Name
                                <Box sx={dragBoxSx}
                                    onMouseDown={(e) => handleMouseDown(3, e)} />
                            </TableCell>
                            <TableCell sx={{ padding: '4px', width: columnWidths[4], position: 'relative', fontWeight: theme.typography.fontWeightBold }}>
                                Template
                                {/* No divider after last column */}
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
        </Box>
    );
};

export default Rundown;