import React, { useRef, useState } from 'react';
import {
    TableRow,
    TableCell,
    Typography,
    Box,
    IconButton,
    Menu,
    MenuItem,
    useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useCell, useDelRowCallback } from 'tinybase/ui-react';
import EditableCell from './editable-cell';

export interface VariableRowProps {
    rowId: string;
    rowNumber: number;
    onDragStart?: (rowId: string) => void;
    onDragOver?: (rowId: string) => void;
    onDrop?: (rowId: string) => void;
    isDragOver?: boolean;
    isBlinking?: boolean;
    blinkAnimation?: any;
    onDuplicate?: (rowId: string) => void;
    // Editing props
    editingCell?: { rowId: string; field: string } | null;
    editValue?: string;
    onCellClick?: (rowId: string, field: string) => void;
    onEditValueChange?: (value: string) => void;
    onCellSave?: () => void;
    onCellCancel?: () => void;
    onCopyVariableName?: (value: string) => void;
}

const VariableRow: React.FC<VariableRowProps> = ({ 
    rowId, 
    rowNumber,
    onDragStart,
    onDragOver,
    onDrop,
    isDragOver,
    isBlinking,
    blinkAnimation,
    onDuplicate,
    editingCell,
    editValue = '',
    onCellClick,
    onEditValueChange,
    onCellSave,
    onCellCancel,
    onCopyVariableName
}) => {
    const theme = useTheme();
    const rowRef = useRef<HTMLTableRowElement>(null);
    
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
                draggable
                onDragStart={handleDragStart}
                onDragOver={(e) => {
                    e.preventDefault();
                    onDragOver?.(rowId);
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    onDrop?.(rowId);
                }}
            >
                <TableCell sx={cellSx}>
                    <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between' 
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MenuIcon sx={{ cursor: 'grab', color: 'text.secondary' }} />
                            <Typography variant="body2" sx={{ minWidth: '24px', textAlign: 'center' }}>
                                {rowNumber}
                            </Typography>
                        </Box>
                        <IconButton
                            size="small"
                            onClick={handleMenuClick}
                            sx={{ 
                                opacity: menuOpen ? 1 : 0,
                                transition: 'opacity 0.2s',
                                '.MuiTableRow-root:hover &': {
                                    opacity: 1
                                }
                            }}
                        >
                            <MoreVertIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </TableCell>
                
                <TableCell sx={cellSx}>
                    {type === 'system' ? (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {name}
                        </Typography>
                    ) : (
                        <EditableCell 
                            rowId={rowId} 
                            field="name" 
                            value={name} 
                            showCopyIcon 
                            isEditing={editingCell?.rowId === rowId && editingCell?.field === 'name'}
                            editValue={editValue}
                            onEditValueChange={onEditValueChange}
                            onSave={onCellSave}
                            onCancel={onCellCancel}
                            onStartEdit={onCellClick}
                            onCopyValue={onCopyVariableName}
                        />
                    )}
                </TableCell>
                
                <TableCell sx={cellSx}>
                    {type === 'system' ? (
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                            System variable
                        </Typography>
                    ) : (
                        <EditableCell 
                            rowId={rowId} 
                            field="description" 
                            value={description} 
                            isEditing={editingCell?.rowId === rowId && editingCell?.field === 'description'}
                            editValue={editValue}
                            onEditValueChange={onEditValueChange}
                            onSave={onCellSave}
                            onCancel={onCellCancel}
                            onStartEdit={onCellClick}
                            onCopyValue={onCopyVariableName}
                        />
                    )}
                </TableCell>
                
                <TableCell sx={cellSx}>
                    {type === 'system' ? (
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {value}
                        </Typography>
                    ) : (
                        <EditableCell 
                            rowId={rowId} 
                            field="value" 
                            value={value} 
                            isEditing={editingCell?.rowId === rowId && editingCell?.field === 'value'}
                            editValue={editValue}
                            onEditValueChange={onEditValueChange}
                            onSave={onCellSave}
                            onCancel={onCellCancel}
                            onStartEdit={onCellClick}
                            onCopyValue={onCopyVariableName}
                        />
                    )}
                </TableCell>
                
                <TableCell sx={cellSx}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {type === 'system' ? 'System' : 'Custom'}
                    </Typography>
                </TableCell>
            </TableRow>
            
            <Menu
                anchorEl={anchorEl}
                open={menuOpen}
                onClose={handleMenuClose}
                onClick={handleMenuClose}
                slotProps={{
                    paper: {
                        elevation: 0,
                        sx: {
                            overflow: 'visible',
                            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                            mt: 1.5,
                            '& .MuiAvatar-root': {
                                width: 32,
                                height: 32,
                                ml: -0.5,
                                mr: 1,
                            },
                            '&::before': {
                                content: '""',
                                display: 'block',
                                position: 'absolute',
                                top: 0,
                                right: 14,
                                width: 10,
                                height: 10,
                                bgcolor: 'background.paper',
                                transform: 'translateY(-50%) rotate(45deg)',
                                zIndex: 0,
                            },
                        },
                        style: {
                            minWidth: '120px',
                        }
                    }
                }}
            >
                <MenuItem onClick={() => {
                    onDuplicate?.(rowId);
                    handleMenuClose();
                }}>
                    Duplicate
                </MenuItem>
                <MenuItem onClick={handleDeleteClick} sx={{ color: theme.palette.error.main }}>
                    Delete
                </MenuItem>
            </Menu>
        </>
    );
};

export default VariableRow;
