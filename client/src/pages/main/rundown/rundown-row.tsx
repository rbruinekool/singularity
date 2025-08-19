import React, { useState } from 'react';
import { CellView, useCell, useSetCellCallback, useDelRowCallback, useStore } from 'tinybase/ui-react';
import { TableRow, TableCell, IconButton, Box, Menu, MenuItem } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import UpgradeIcon from '@mui/icons-material/Upgrade';

// Component to handle the logicLayer JSON field
const LogicLayerCell: React.FC<{ tableId: string; rowId: string }> = ({ tableId, rowId }) => {
    const logicLayerString = useCell(tableId, rowId, 'logicLayer') as string;
    
    try {
        const logicLayer = JSON.parse(logicLayerString || '{}');
        return <span>{logicLayer.name || 'N/A'}</span>;
    } catch {
        return <span>N/A</span>;
    }
};

interface RundownRowProps {
    rowId: string;
    columnWidths: number[];
    tableId: string;
    selectedRowId?: string | null;
    onRowSelect?: (rowId: string) => void;
    onRowDelete?: (rowId: string) => void;
    onDragStart?: (rowId: string) => void;
    onDragOver?: (rowId: string) => void;
    onDrop?: (rowId: string) => void;
    isDragOver?: boolean;
}

const RundownRow: React.FC<RundownRowProps> = ({
    rowId,
    columnWidths,
    tableId,
    selectedRowId,
    onRowSelect,
    onRowDelete,
    onDragStart,
    onDragOver,
    onDrop,
    isDragOver,
}) => {
    const theme = useTheme();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const menuOpen = Boolean(anchorEl);
    const store = useStore();

    // Check if this row is selected
    const isSelected = selectedRowId === rowId;

    const rowStatus = useCell(tableId, rowId, 'state') as string;


    const cellSx = {
        padding: '4px',
        fontWeight: theme.typography.fontWeightRegular,
        ...theme.typography.body1,
    };

    const handleStopClick = useSetCellCallback(
        'rundown-1',
        rowId,
        'state',
        () => 'Out1',
        [rowId]
    );
    const handlePlayClick = useSetCellCallback(
        'rundown-1',
        rowId,
        'state',
        () => 'In',
        [rowId]
    );

    const handleUpdateClick = useSetCellCallback(
        'rundown-1',
        rowId,
        'update',
        () => Date.now(),
        [rowId]
    );

    const handleDeleteClick = useDelRowCallback(
        tableId,
        rowId,
        undefined,
        () => {
            // Call the onRowDelete callback before deleting to clear selection if needed
            onRowDelete?.(rowId);
            handleMenuClose();
        }
    );

    const handleDuplicateClick = () => {
        if (!store) return;

        store.transaction(() => {
            // Get the original row data
            const originalRow = store.getRow(tableId, rowId);
            if (!originalRow) return;

            const originalOrder = originalRow.order as number;
            const originalName = originalRow.name as string;

            // Increment orders of all rows below the current one
            const rowIds = store.getRowIds(tableId);
            rowIds.forEach((id) => {
                const currentOrder = store.getCell(tableId, id, 'order');
                if (typeof currentOrder === 'number' && currentOrder > originalOrder) {
                    store.setCell(tableId, id, 'order', currentOrder + 1);
                }
            });

            // Create new row with duplicated data
            store.addRow(tableId, {
                ...originalRow,
                name: `copy of ${originalName}`,
                order: originalOrder + 1,
            });
        });

        handleMenuClose();
    };


    const handleMoreClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleRowClick = (event: React.MouseEvent) => {
        // Don't trigger row selection if clicking on interactive elements
        const target = event.target as HTMLElement;
        const isInteractive = target.closest('button') ||
            target.closest('input') ||
            target.closest('[role="button"]') ||
            target.tagName.toLowerCase() === 'svg';

        if (!isInteractive && onRowSelect) {
            onRowSelect(rowId);
        }
    };


    return (
        <>
            <TableRow
                onClick={handleRowClick}
                onDragOver={e => {
                    e.preventDefault();
                    onDragOver?.(rowId);
                }}
                onDrop={() => onDrop?.(rowId)}
                sx={{
                    backgroundColor: rowStatus === 'In'
                        ? theme.custom.live
                        : isSelected
                            ? theme.custom.selected
                            : isDragOver
                                ? theme.custom.hover
                                : undefined,
                    cursor: 'pointer',
                    '&:hover': {
                        backgroundColor: rowStatus === 'In'
                            ? theme.custom.liveHover
                            : isSelected
                                ? theme.custom.selected
                                : theme.custom.hover,
                    }
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
                        <IconButton size="small" sx={{ color: '#FFD700' }} aria-label="Update" onClick={handleUpdateClick}>
                            <UpgradeIcon fontSize="small" />
                        </IconButton>
                    </Box>
                </TableCell>
                <TableCell sx={{ ...cellSx, width: columnWidths[2] }}>
                    <CellView tableId={tableId} rowId={rowId} cellId="name" />
                </TableCell>
                <TableCell sx={{ ...cellSx, width: columnWidths[3] }}>
                    <CellView tableId={tableId} rowId={rowId} cellId="appLabel" />
                </TableCell>
                <TableCell sx={{ ...cellSx, width: columnWidths[4] }}>
                    <CellView tableId={tableId} rowId={rowId} cellId="subCompositionName" />
                </TableCell>
                <TableCell sx={{ ...cellSx, width: columnWidths[5] }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                        <LogicLayerCell tableId={tableId} rowId={rowId} />
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

export default RundownRow;