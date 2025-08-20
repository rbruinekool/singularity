import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Box,
    IconButton,
    Menu,
    MenuItem,
    useTheme,
    Snackbar,
    keyframes
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MenuIcon from '@mui/icons-material/Menu';
import { 
    useStore, 
    useTable, 
    useRowIds, 
    useCell,
    useDelRowCallback
} from 'tinybase/ui-react';

interface SortConfig {
    key: string;
    direction: 'asc' | 'desc';
}

interface FilterConfig {
    type: string;
    name: string;
    description: string;
    value: string;
}

const VariablesTable: React.FC = () => {
    const theme = useTheme();
    const store = useStore();
    
    // Drag and drop state
    const draggedRowIdRef = useRef<string | null>(null);
    const [dragOverRowId, setDragOverRowId] = useState<string | null>(null);
    
    // Animation state for new rows
    const [blinkingRows, setBlinkingRows] = useState<Set<string>>(new Set());
    
    // State for sorting and filtering
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [filters, setFilters] = useState<FilterConfig>({
        type: '',
        name: '',
        description: '',
        value: ''
    });
    const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
    const [editValue, setEditValue] = useState('');
    
    // Add variable dialog state
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newVariable, setNewVariable] = useState({
        name: '',
        description: '',
        value: ''
    });
    
    // Copy feedback state
    const [copySnackbarOpen, setCopySnackbarOpen] = useState(false);
    
    // TinyBase hooks
    const variableRowIds = useRowIds('variables') || [];
    const variablesTable = useTable('variables');
    
    // Set up listener for row additions to trigger blinking animation
    useEffect(() => {
        if (!store) return;

        const listenerId = store.addRowListener('variables', null, (store, tableId, rowId, getCellChange) => {
            // This listener fires when a row is added to the variables table
            setBlinkingRows(prev => {
                const newSet = new Set(prev);
                newSet.add(rowId);
                return newSet;
            });
            
            // Remove the row from blinking set after animation completes
            setTimeout(() => {
                setBlinkingRows(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(rowId);
                    return newSet;
                });
            }, 600);
        });

        return () => {
            store.delListener(listenerId);
        };
    }, [store]);
    
    // CSS animation for blinking effect
    const blinkAnimation = keyframes`
        0%, 100% { background-color: transparent; }
        50% { background-color: ${theme.palette.primary.main}33; }
    `;
    
    
    // Generate unique variable name
    const generateVariableName = useCallback(() => {
        const existingNames = variableRowIds.map(id => {
            const name = store?.getCell('variables', id, 'name') as string || '';
            const match = name.match(/\$\(custom:(.+)\)/);
            return match ? match[1] : '';
        }).filter(Boolean);
        
        let counter = 1;
        let baseName = 'variable';
        let newName = `${baseName} ${counter}`;
        
        while (existingNames.includes(newName)) {
            counter++;
            newName = `${baseName} ${counter}`;
        }
        
        return `$(custom:${newName})`;
    }, [variableRowIds, store]);
    
    // Check if variable name already exists
    const isVariableNameTaken = useCallback((name: string) => {
        const fullName = `$(custom:${name})`;
        return variableRowIds.some(id => 
            store?.getCell('variables', id, 'name') === fullName
        );
    }, [variableRowIds, store]);
    
    // Handle add variable dialog
    const handleAddClick = () => {
        setNewVariable({ name: '', description: '', value: '' });
        setAddDialogOpen(true);
    };

    const handleDialogClose = () => {
        setAddDialogOpen(false);
        setNewVariable({ name: '', description: '', value: '' });
    };

    const handleDialogSubmit = () => {
        const trimmedName = newVariable.name.trim();
        
        if (!trimmedName) {
            alert('Variable name is required');
            return;
        }
        
        if (isVariableNameTaken(trimmedName)) {
            alert('Variable name already exists');
            return;
        }
        
        if (!store) return;
        
        store.addRow('variables', {
            type: 'custom',
            name: `$(custom:${trimmedName})`,
            description: newVariable.description.trim(),
            value: newVariable.value.trim(),
            order: variableRowIds.length
        });
        
        handleDialogClose();
    };

    const handleKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            handleDialogSubmit();
        }
    };
    
    // Add new variable row (removed old implementation)
    // const addNewVariable = useAddRowCallback(
    //     'variables',
    //     () => ({
    //         type: 'custom',
    //         name: generateVariableName(),
    //         description: '',
    //         value: '',
    //         order: variableRowIds.length
    //     }),
    //     [generateVariableName, variableRowIds.length]
    // );
    
    // Handle copy to clipboard
    const handleCopyVariableName = useCallback(async (variableName: string) => {
        try {
            await navigator.clipboard.writeText(variableName);
            setCopySnackbarOpen(true);
        } catch (err) {
            console.error('Failed to copy variable name:', err);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = variableName;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                setCopySnackbarOpen(true);
            } catch (fallbackErr) {
                console.error('Fallback copy failed:', fallbackErr);
            }
            document.body.removeChild(textArea);
        }
    }, []);
    
    // Handle sorting
    const handleSort = useCallback((key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    }, []);
    
    // Update row orders for drag and drop
    const updateRowOrders = useCallback((reorderedRowIds: string[]) => {
        if (!store) return;

        store.transaction(() => {
            reorderedRowIds.forEach((rowId, idx) => {
                store.setCell('variables', rowId, 'order', idx);
            });
        });
    }, [store]);

    // Move row for drag and drop
    const moveRow = useCallback((fromRowId: string, toRowId: string) => {
        if (!store || !variableRowIds) return;
        if (fromRowId === toRowId) return;

        // Get all rows and sort by order
        const rowIds = [...variableRowIds];
        rowIds.sort((a, b) => {
            const orderA = store.getCell('variables', a, 'order') as number ?? 0;
            const orderB = store.getCell('variables', b, 'order') as number ?? 0;
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

        // Update the orders
        updateRowOrders(rowIds);
    }, [store, variableRowIds, updateRowOrders]);
    
    // Handle filtering
    const handleFilterChange = useCallback((field: keyof FilterConfig, value: string) => {
        setFilters(current => ({ ...current, [field]: value }));
    }, []);
    
    // Filter and sort data
    const filteredAndSortedRowIds = useMemo(() => {
        if (!variablesTable) return [];
        
        let filtered = variableRowIds.filter(rowId => {
            const type = (store?.getCell('variables', rowId, 'type') as string || '').toLowerCase();
            const name = (store?.getCell('variables', rowId, 'name') as string || '').toLowerCase();
            const description = (store?.getCell('variables', rowId, 'description') as string || '').toLowerCase();
            const value = (store?.getCell('variables', rowId, 'value') as string || '').toLowerCase();
            
            return (
                type.includes(filters.type.toLowerCase()) &&
                name.includes(filters.name.toLowerCase()) &&
                description.includes(filters.description.toLowerCase()) &&
                value.includes(filters.value.toLowerCase())
            );
        });
        
        if (sortConfig) {
            filtered.sort((a, b) => {
                const aValue = (store?.getCell('variables', a, sortConfig.key) as string || '').toLowerCase();
                const bValue = (store?.getCell('variables', b, sortConfig.key) as string || '').toLowerCase();
                
                if (sortConfig.direction === 'asc') {
                    return aValue.localeCompare(bValue);
                } else {
                    return bValue.localeCompare(aValue);
                }
            });
        } else {
            // Default sort by order when no explicit sort is applied
            filtered.sort((a, b) => {
                const orderA = store?.getCell('variables', a, 'order') as number ?? 0;
                const orderB = store?.getCell('variables', b, 'order') as number ?? 0;
                return orderA - orderB;
            });
        }
        
        return filtered;
    }, [variableRowIds, variablesTable, filters, sortConfig, store]);
    
    // Handle cell editing (removed name editing)
    const handleCellClick = useCallback((rowId: string, field: string) => {
        // Only allow editing description and value fields
        if (field !== 'description' && field !== 'value') return;
        
        setEditValue(store?.getCell('variables', rowId, field) as string || '');
        setEditingCell({ rowId, field });
    }, [store]);
    
    const handleCellSave = useCallback(() => {
        if (!editingCell || !store) return;
        
        const { rowId, field } = editingCell;
        const valueToSave = editValue;
        
        store.setCell('variables', rowId, field, valueToSave);
        setEditingCell(null);
        setEditValue('');
    }, [editingCell, editValue, store]);
    
    const handleCellCancel = useCallback(() => {
        setEditingCell(null);
        setEditValue('');
    }, []);
    
    // Cell component for rendering editable cells
    const EditableCell: React.FC<{ 
        rowId: string; 
        field: string; 
        value: string; 
        showCopyIcon?: boolean 
    }> = ({ rowId, field, value, showCopyIcon = false }) => {
        const isEditing = editingCell?.rowId === rowId && editingCell?.field === field;
        
        if (isEditing) {
            return (
                <Box 
                    display="flex" 
                    alignItems="center" 
                    gap={0.5}
                    sx={{ 
                        minHeight: '24px',
                        width: '100%'
                    }}
                >
                    <TextField
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCellSave();
                            if (e.key === 'Escape') handleCellCancel();
                        }}
                        onBlur={handleCellSave}
                        autoFocus
                        size="small"
                        variant="outlined"
                        sx={{ 
                            flex: 1,
                            '& .MuiInputBase-root': { 
                                fontSize: theme.typography.body1.fontSize,
                                minHeight: '24px'
                            },
                            '& .MuiInputBase-input': {
                                padding: '4px 8px'
                            }
                        }}
                    />
                    {/* Reserve space for copy icon to prevent layout shift */}
                    {showCopyIcon && (
                        <Box sx={{ width: '24px', height: '24px', marginLeft: '4px' }} />
                    )}
                </Box>
            );
        }
        
        const displayValue = field === 'name' && value ? 
            value : value; // Show full programmatic name for name field
        
        const showPlaceholder = !displayValue && (field === 'description' || field === 'value');
        const placeholderText = field === 'description' ? 'Click to add description...' : 'Click to add value...';
        const isNameField = field === 'name';
        
        return (
            <Box 
                display="flex" 
                alignItems="center" 
                gap={0.5}
                onClick={() => !isNameField && handleCellClick(rowId, field)}
                sx={{ 
                    cursor: isNameField ? 'default' : 'pointer', 
                    minHeight: '24px' 
                }}
            >
                <Typography 
                    variant="body1"
                    sx={{
                        fontStyle: showPlaceholder ? 'italic' : 'normal',
                        color: showPlaceholder ? theme.palette.text.disabled : theme.palette.text.primary,
                        opacity: showPlaceholder ? 0.7 : 1
                    }}
                >
                    {showPlaceholder ? placeholderText : (displayValue || '')}
                </Typography>
                {showCopyIcon && value && (
                    <IconButton
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleCopyVariableName(value);
                        }}
                        sx={{ 
                            color: theme.palette.text.secondary,
                            '&:hover': { color: theme.palette.primary.main },
                            padding: '2px',
                            marginLeft: '4px'
                        }}
                    >
                        <ContentCopyIcon fontSize="small" />
                    </IconButton>
                )}
            </Box>
        );
    };
    
    const cellSx = {
        padding: '8px 12px',
        fontSize: theme.typography.body1.fontSize,
        fontWeight: theme.typography.fontWeightRegular,
        borderBottom: `1px solid ${theme.palette.divider}`,
        borderRight: `1px solid ${theme.palette.divider}`,
        '&:last-child': {
            borderRight: 'none'
        }
    };
    
    const filterCellSx = {
        ...cellSx,
        backgroundColor: theme.custom.filterRow,
    };
    
    const headerCellSx = {
        ...cellSx,
        backgroundColor: theme.palette.background.default,
        fontWeight: theme.typography.fontWeightMedium,
        cursor: 'pointer',
        '&:hover': {
            backgroundColor: theme.custom.hover,
        }
    };

    return (
        <Box>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddClick}
                    sx={{
                        backgroundColor: theme.palette.primary.main,
                        '&:hover': {
                            backgroundColor: theme.palette.primary.dark,
                        }
                    }}
                >
                    Add Variable
                </Button>
            </Box>
            <TableContainer 
                component={Paper} 
                sx={{ 
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1
                }}
            >
                <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ ...headerCellSx, width: '40px', textAlign: 'center' }}>
                                #
                            </TableCell>
                            <TableCell 
                                sx={{ ...headerCellSx, width: '150px' }}
                                onClick={() => handleSort('name')}
                            >
                                <Box display="flex" alignItems="center" gap={1}>
                                    Name
                                    {sortConfig?.key === 'name' && (
                                        sortConfig.direction === 'asc' ? 
                                        <ArrowUpwardIcon fontSize="small" /> : 
                                        <ArrowDownwardIcon fontSize="small" />
                                    )}
                                </Box>
                            </TableCell>
                            <TableCell 
                                sx={{ ...headerCellSx, width: '200px' }}
                                onClick={() => handleSort('description')}
                            >
                                <Box display="flex" alignItems="center" gap={1}>
                                    Description
                                    {sortConfig?.key === 'description' && (
                                        sortConfig.direction === 'asc' ? 
                                        <ArrowUpwardIcon fontSize="small" /> : 
                                        <ArrowDownwardIcon fontSize="small" />
                                    )}
                                </Box>
                            </TableCell>
                            <TableCell 
                                sx={{ ...headerCellSx, width: '250px' }}
                                onClick={() => handleSort('value')}
                            >
                                <Box display="flex" alignItems="center" gap={1}>
                                    Current Value
                                    {sortConfig?.key === 'value' && (
                                        sortConfig.direction === 'asc' ? 
                                        <ArrowUpwardIcon fontSize="small" /> : 
                                        <ArrowDownwardIcon fontSize="small" />
                                    )}
                                </Box>
                            </TableCell>
                            <TableCell 
                                sx={{ ...headerCellSx, width: '100px' }}
                                onClick={() => handleSort('type')}
                            >
                                <Box display="flex" alignItems="center" gap={1}>
                                    Data Type
                                    {sortConfig?.key === 'type' && (
                                        sortConfig.direction === 'asc' ? 
                                        <ArrowUpwardIcon fontSize="small" /> : 
                                        <ArrowDownwardIcon fontSize="small" />
                                    )}
                                </Box>
                            </TableCell>
                            <TableCell sx={{ ...headerCellSx, width: '60px', textAlign: 'center' }}>
                                Actions
                            </TableCell>
                        </TableRow>
                        
                        {/* Filter Row */}
                        <TableRow>
                            <TableCell sx={filterCellSx}></TableCell>
                            <TableCell sx={{ ...filterCellSx, width: '150px' }}>
                                <TextField
                                    size="small"
                                    placeholder="Filter by name..."
                                    value={filters.name}
                                    onChange={(e) => handleFilterChange('name', e.target.value)}
                                    sx={{ 
                                        '& .MuiInputBase-root': { 
                                            backgroundColor: theme.palette.background.paper 
                                        }
                                    }}
                                />
                            </TableCell>
                            <TableCell sx={{ ...filterCellSx, width: '200px' }}>
                                <TextField
                                    size="small"
                                    placeholder="Filter by description..."
                                    value={filters.description}
                                    onChange={(e) => handleFilterChange('description', e.target.value)}
                                    sx={{ 
                                        '& .MuiInputBase-root': { 
                                            backgroundColor: theme.palette.background.paper 
                                        }
                                    }}
                                />
                            </TableCell>
                            <TableCell sx={{ ...filterCellSx, width: '250px' }}>
                                <TextField
                                    size="small"
                                    placeholder="Filter by value..."
                                    value={filters.value}
                                    onChange={(e) => handleFilterChange('value', e.target.value)}
                                    sx={{ 
                                        '& .MuiInputBase-root': { 
                                            backgroundColor: theme.palette.background.paper 
                                        }
                                    }}
                                />
                            </TableCell>
                            <TableCell sx={{ ...filterCellSx, width: '100px' }}>
                                <TextField
                                    size="small"
                                    placeholder="Filter by type..."
                                    value={filters.type}
                                    onChange={(e) => handleFilterChange('type', e.target.value)}
                                    sx={{ 
                                        '& .MuiInputBase-root': { 
                                            backgroundColor: theme.palette.background.paper 
                                        }
                                    }}
                                />
                            </TableCell>
                            <TableCell sx={{ ...filterCellSx, width: '60px' }}>
                                {/* Empty cell for actions column */}
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredAndSortedRowIds.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} sx={{ ...cellSx, textAlign: 'center', fontStyle: 'italic' }}>
                                    {variableRowIds.length === 0 ? 
                                        'No variables yet. Click the + button to add one.' :
                                        'No variables match the current filters.'
                                    }
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredAndSortedRowIds.map((rowId, index) => (
                                <VariableRow 
                                    key={rowId} 
                                    rowId={rowId} 
                                    rowNumber={index + 1}
                                    EditableCell={EditableCell}
                                    onDragStart={(rowId) => { draggedRowIdRef.current = rowId; }}
                                    onDragOver={setDragOverRowId}
                                    onDrop={(targetRowId) => {
                                        if (draggedRowIdRef.current) {
                                            moveRow(draggedRowIdRef.current, targetRowId);
                                            draggedRowIdRef.current = null;
                                            setDragOverRowId(null);
                                        }
                                    }}
                                    isDragOver={rowId === dragOverRowId}
                                    isBlinking={blinkingRows.has(rowId)}
                                    blinkAnimation={blinkAnimation}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            
            <Snackbar
                open={copySnackbarOpen}
                autoHideDuration={2000}
                onClose={() => setCopySnackbarOpen(false)}
                message="Variable name copied to clipboard!"
            />
            
            {/* Add Variable Dialog */}
            <Dialog open={addDialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
                <DialogTitle>Add New Variable</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Variable Name"
                        fullWidth
                        variant="outlined"
                        value={newVariable.name}
                        onChange={(e) => setNewVariable(prev => ({ ...prev, name: e.target.value }))}
                        onKeyPress={handleKeyPress}
                        error={newVariable.name.trim() !== '' && isVariableNameTaken(newVariable.name.trim())}
                        helperText={
                            newVariable.name.trim() !== '' && isVariableNameTaken(newVariable.name.trim()) 
                                ? "A variable with this name already exists" 
                                : "Enter the variable name (without the $(custom:...) wrapper)"
                        }
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        margin="dense"
                        label="Description"
                        fullWidth
                        variant="outlined"
                        value={newVariable.description}
                        onChange={(e) => setNewVariable(prev => ({ ...prev, description: e.target.value }))}
                        onKeyPress={handleKeyPress}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        margin="dense"
                        label="Initial Value"
                        fullWidth
                        variant="outlined"
                        value={newVariable.value}
                        onChange={(e) => setNewVariable(prev => ({ ...prev, value: e.target.value }))}
                        onKeyPress={handleKeyPress}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleDialogClose}>Cancel</Button>
                    <Button 
                        onClick={handleDialogSubmit} 
                        variant="contained"
                        disabled={
                            !newVariable.name.trim() || 
                            isVariableNameTaken(newVariable.name.trim())
                        }
                    >
                        Add Variable
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

// Variable row component
interface VariableRowProps {
    rowId: string;
    rowNumber: number;
    EditableCell: React.FC<{ rowId: string; field: string; value: string; showCopyIcon?: boolean }>;
    onDragStart?: (rowId: string) => void;
    onDragOver?: (rowId: string) => void;
    onDrop?: (rowId: string) => void;
    isDragOver?: boolean;
    isBlinking?: boolean;
    blinkAnimation?: any;
}

const VariableRow: React.FC<VariableRowProps> = ({ 
    rowId, 
    rowNumber,
    EditableCell,
    onDragStart,
    onDragOver,
    onDrop,
    isDragOver,
    isBlinking,
    blinkAnimation
}) => {
    const theme = useTheme();
    const rowRef = useRef<HTMLTableRowElement>(null);
    const store = useStore();
    const variableRowIds = useRowIds('variables') || [];
    
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const menuOpen = Boolean(anchorEl);
    
    const name = useCell('variables', rowId, 'name') as string || '';
    const description = useCell('variables', rowId, 'description') as string || '';
    const value = useCell('variables', rowId, 'value') as string || '';
    const type = useCell('variables', rowId, 'type') as string || '';
    
    const handleDragStart = (e: React.DragEvent) => {
        // Use the entire row as the drag image
        if (rowRef.current) {
            e.dataTransfer.setDragImage(rowRef.current, 0, 0);
        }
        onDragStart?.(rowId);
    };

    const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleDeleteClick = useDelRowCallback(
        'variables',
        rowId,
        undefined,
        () => {
            handleMenuClose();
        }
    );

    const handleDuplicateClick = () => {
        if (!store) return;

        store.transaction(() => {
            // Get the original row data
            const originalRow = store.getRow('variables', rowId);
            if (!originalRow) return;

            const originalOrder = originalRow.order as number;
            const originalName = originalRow.name as string;

            // Generate unique name for duplicate
            const match = originalName.match(/\$\(custom:(.+)\)/);
            const baseName = match ? match[1] : 'variable';
            
            const existingNames = variableRowIds.map(id => {
                const existingName = store.getCell('variables', id, 'name') as string || '';
                const existingMatch = existingName.match(/\$\(custom:(.+)\)/);
                return existingMatch ? existingMatch[1] : '';
            }).filter(Boolean);
            
            let counter = 1;
            let newName = `${baseName} copy`;
            while (existingNames.includes(newName)) {
                counter++;
                newName = `${baseName} copy ${counter}`;
            }

            // Increment orders of all rows below the current one
            variableRowIds.forEach((id) => {
                const currentOrder = store.getCell('variables', id, 'order');
                if (typeof currentOrder === 'number' && currentOrder > originalOrder) {
                    store.setCell('variables', id, 'order', currentOrder + 1);
                }
            });

            // Create new row with duplicated data
            store.addRow('variables', {
                ...originalRow,
                name: `$(custom:${newName})`,
                order: originalOrder + 1,
            });
        });

        handleMenuClose();
    };
    
    const cellSx = {
        padding: '8px 12px',
        fontSize: theme.typography.body1.fontSize,
        fontWeight: theme.typography.fontWeightRegular,
        borderBottom: `1px solid ${theme.palette.divider}`,
        borderRight: `1px solid ${theme.palette.divider}`,
        '&:last-child': {
            borderRight: 'none'
        }
    };
    
    return (
        <>
            <TableRow
                ref={rowRef}
                sx={{
                    '&:hover': {
                        backgroundColor: theme.custom.hover,
                    },
                    bgcolor: isDragOver ? 'action.hover' : 'inherit',
                    ...(isBlinking && {
                        animation: `${blinkAnimation} 0.6s ease-in-out`
                    })
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                    onDragOver?.(rowId);
                }}
                onDrop={() => onDrop?.(rowId)}
            >
                <TableCell 
                    sx={{ 
                        ...cellSx,
                        width: 40, 
                        pl: 1, 
                        pr: 1, 
                        textAlign: 'center',
                        cursor: 'grab',
                        '&:active': { cursor: 'grabbing' }
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <Box 
                        sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            gap: 0.5 
                        }}
                        draggable
                        onDragStart={handleDragStart}
                    >
                        <MenuIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                            {rowNumber}
                        </Typography>
                    </Box>
                </TableCell>
                <TableCell sx={{ ...cellSx, width: 150 }}>
                    <EditableCell rowId={rowId} field="name" value={name} showCopyIcon />
                </TableCell>
                <TableCell sx={{ ...cellSx, width: 200 }}>
                    <EditableCell rowId={rowId} field="description" value={description} />
                </TableCell>
                <TableCell sx={{ ...cellSx, width: 250 }}>
                    <EditableCell rowId={rowId} field="value" value={value} />
                </TableCell>
                <TableCell sx={{ ...cellSx, width: 100 }}>
                    <EditableCell rowId={rowId} field="dataType" value={type} />
                </TableCell>
                <TableCell sx={{ ...cellSx, width: 60, textAlign: 'center' }}>
                    <IconButton
                        size="small"
                        aria-label="More options"
                        onClick={handleMenuClick}
                        sx={{ color: theme.palette.text.secondary }}
                    >
                        <MoreVertIcon fontSize="small" />
                    </IconButton>
                </TableCell>
            </TableRow>

            <Menu
                anchorEl={anchorEl}
                open={menuOpen}
                onClose={handleMenuClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                PaperProps={{
                    sx: {
                        minWidth: '120px',
                    }
                }}
            >
                <MenuItem onClick={handleDuplicateClick}>
                    Duplicate
                </MenuItem>
                <MenuItem onClick={handleDeleteClick} sx={{ color: theme.palette.error.main }}>
                    Delete
                </MenuItem>
            </Menu>
        </>
    );
};

export default VariablesTable;
