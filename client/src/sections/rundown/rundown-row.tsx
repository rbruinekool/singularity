import React, { useState } from 'react';
import { CellView, useStore, useCell } from 'tinybase/ui-react';
import { TableRow, TableCell, IconButton, Box, Menu, MenuItem, TextField } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import MoreVertIcon from '@mui/icons-material/MoreVert';

interface RundownRowProps {
    rowId: string;
    columnWidths: number[];
    tableId: string;
    onDragStart?: (rowId: string) => void;
    onDragOver?: (rowId: string) => void;
    onDrop?: (rowId: string) => void;
    isDragOver?: boolean;
}

const RundownRow: React.FC<RundownRowProps> = ({
    rowId,
    columnWidths,
    tableId,
    onDragStart,
    onDragOver,
    onDrop,
    isDragOver,
}) => {
    const store = useStore();
    const theme = useTheme();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const menuOpen = Boolean(anchorEl);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState('');
    
    // Get the current name value from the store
    const currentName = useCell(tableId, rowId, 'name') as string || '';

    const cellSx = {
        padding: '4px',
        fontWeight: theme.typography.fontWeightRegular,
        ...theme.typography.body1,
    };

    const handlePlayClick = () => {
        if (!store) throw new Error('Store is not available');
        store.setCell('rundown-1', rowId, 'status', 'In');
    }

    const handleStopClick = () => {
        if (!store) throw new Error('Store is not available');
        store.setCell('rundown-1', rowId, 'status', 'Out1');
    }

    const handleMoreClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleDeleteClick = () => {
        if (!store) throw new Error('Store is not available');
        store.delRow(tableId, rowId);
        handleMenuClose();
    };

    const handleNameClick = () => {
        setEditNameValue(currentName);
        setIsEditingName(true);
    };

    const handleNameSubmit = () => {
        if (!store) throw new Error('Store is not available');
        store.setCell(tableId, rowId, 'name', editNameValue);
        setIsEditingName(false);
    };

    const handleNameCancel = () => {
        setIsEditingName(false);
        setEditNameValue('');
    };

    const handleNameKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            handleNameSubmit();
        } else if (event.key === 'Escape') {
            handleNameCancel();
        }
    };


    return (
        <>
            <TableRow
                onDragOver={e => {
                    e.preventDefault();
                    onDragOver?.(rowId);
                }}
                onDrop={() => onDrop?.(rowId)}
                sx={{
                    backgroundColor: isDragOver ? theme.palette.action.hover : undefined,
                }}
            >
                <TableCell sx={{ ...cellSx, width: columnWidths[0], borderRight: undefined, textAlign: 'center' }}>
                    <span
                        draggable
                        onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', rowId);
                            // Find the closest TableRow (tr) element
                            const tr = e.currentTarget.closest('tr');
                            if (tr) {
                                // Clone the row and cast to HTMLTableRowElement
                                const clone = tr.cloneNode(true) as HTMLTableRowElement;
                                clone.style.position = 'absolute';
                                clone.style.top = '-9999px';
                                clone.style.left = '-9999px';
                                clone.style.opacity = '0.5';
                                clone.style.pointerEvents = 'none';
                                document.body.appendChild(clone);
                                // Use the clone as the drag image
                                e.dataTransfer.setDragImage(clone, 0, 20);

                                // Remove the clone after a short delay
                                setTimeout(() => {
                                    document.body.removeChild(clone);
                                }, 0);
                            }
                            onDragStart?.(rowId);
                        }}
                        style={{ cursor: 'grab', display: 'inline-flex', alignItems: 'center' }}
                        tabIndex={0}
                        aria-label="Drag row"
                    >
                        <MenuIcon fontSize="small" sx={{ color: '#888' }} />
                    </span>
                </TableCell>
                <TableCell sx={{ ...cellSx, width: columnWidths[1] }}>
                    <Box display="flex" alignItems="center" gap={0.5}>
                        <IconButton size="small" sx={{ color: 'green' }} aria-label="Play" onClick={handlePlayClick}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                        </IconButton>
                        <IconButton size="small" sx={{ color: theme.palette.primary.main }} aria-label="Stop" onClick={handleStopClick}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z" /></svg>
                        </IconButton>
                    </Box>
                </TableCell>
                <TableCell sx={{ ...cellSx, width: columnWidths[2] }}>
                    <CellView tableId={tableId} rowId={rowId} cellId="layer" />
                </TableCell>
                <TableCell sx={{ ...cellSx, width: columnWidths[3] }}>
                    {isEditingName ? (
                        <TextField
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            onBlur={handleNameSubmit}
                            onKeyDown={handleNameKeyDown}
                            size="small"
                            variant="standard"
                            autoFocus
                            sx={{
                                '& .MuiInput-input': {
                                    padding: '2px 0',
                                    fontSize: theme.typography.body1.fontSize,
                                    fontFamily: theme.typography.body1.fontFamily,
                                }
                            }}
                        />
                    ) : (
                        <Box
                            onClick={handleNameClick}
                            sx={{
                                cursor: 'pointer',
                                padding: '2px 0',
                                minHeight: '20px',
                                color: currentName ? 'inherit' : theme.palette.text.secondary,
                                fontStyle: currentName ? 'normal' : 'italic',
                                '&:hover': {
                                    backgroundColor: theme.palette.action.hover,
                                    borderRadius: '2px',
                                }
                            }}
                        >
                            {currentName || 'Click to edit'}
                        </Box>
                    )}
                </TableCell>
                <TableCell sx={{ ...cellSx, width: columnWidths[4] }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <CellView tableId={tableId} rowId={rowId} cellId="template" />
                        <IconButton
                            size="small"
                            aria-label="More options"
                            onClick={handleMoreClick}
                            sx={{ color: theme.palette.text.secondary, ml: 1 }}
                        >
                            <MoreVertIcon fontSize="small" />
                        </IconButton>
                    </Box>
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
                <MenuItem onClick={handleDeleteClick} sx={{ color: theme.palette.error.main }}>
                    Delete
                </MenuItem>
            </Menu>
        </>
    );
};

export default RundownRow;