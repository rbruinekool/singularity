import React, { useRef, useEffect, useState } from 'react';
import { Box, Card, CardContent, CardHeader, IconButton, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button, Tooltip } from '@mui/material';
import { DragIndicator, Autorenew, Delete as DeleteIcon } from '@mui/icons-material';
import { useDrag } from 'react-dnd';
import { ResizableBox } from 'react-resizable';
import type { TableCardData } from '../table-card-grid';
import 'react-resizable/css/styles.css';
import ManualTable from './manual-table';
import SpreadsheetTable from './spreadsheet-table';
import ManualTableIcon from '../assets/ManualTableIcon';
import SpreadsheetTableIcon from '../assets/spreadsheet-table-icon';
import fetchTableFromSheet from '../api/fetch-table';
import { useStore } from 'tinybase/ui-react';

interface TableCardProps {
    card: TableCardData;
    isSelected: boolean;
    onMove: (id: string, x: number, y: number) => void;
    onResize: (id: string, width: number, height: number) => void;
    onResizePreview: (id: string, width: number, height: number) => void;
    onResizeEnd: () => void;
    onSelect: (id: string) => void;
    onDeleteTable: (tableId: string) => void;
}

const TableCard: React.FC<TableCardProps> = ({
    card,
    isSelected,
    onResize,
    onResizePreview,
    onResizeEnd,
    onSelect,
    onDeleteTable
}) => {
    // Dialog state for delete confirmation
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const dragRef = useRef<HTMLButtonElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const store = useStore();

    // Calculate maximum width based on screen size and container padding
    // Tables page has p: 3 (24px), TableCardGrid has p: 2 (16px) = 40px total padding per side
    const [maxWidth, setMaxWidth] = useState(800);

    useEffect(() => {
        const calculateMaxWidth = () => {
            const totalPadding = 40 * 2; // 40px per side (Tables page + grid padding)
            const availableWidth = window.innerWidth - totalPadding;
            setMaxWidth(Math.max(200, availableWidth)); // Ensure at least minimum width
        };

        calculateMaxWidth();
        window.addEventListener('resize', calculateMaxWidth);
        return () => window.removeEventListener('resize', calculateMaxWidth);
    }, []);

    const [{ isDragging }, drag, dragPreview] = useDrag({
        type: 'table-card',
        item: {
            id: card.id,
            left: card.x,
            top: card.y,
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    // Connect the drag source to the drag handle only
    drag(dragRef);
    dragPreview(previewRef);

    const handleResizeStart = () => {
        // Clear any existing guides when starting resize
        onResizeEnd();
    };

    const handleResizeStop = (_event: any, { size }: { size: { width: number; height: number } }) => {
        // Apply final resize with snapping and clear guides
        onResize(card.id, size.width, size.height);
        onResizeEnd();
    };

    const handleResizing = (_event: any, { size }: { size: { width: number; height: number } }) => {
        // Show snap guides during resize
        onResizePreview(card.id, size.width, size.height);
    };

    // Function to refresh spreadsheet table data
    const refreshSpreadsheetTable = async () => {
        // Prevent multiple refresh operations at the same time
        if (isRefreshing || !store || card.type !== 'Google Spreadsheet') return;

        try {
            setIsRefreshing(true);

            // Get the spreadsheet URL and sheet name from the DataTables row
            const webAppUrl = store.getCell('DataTables', card.id, 'webAppUrl') as string;
            const sheetName = store.getCell('DataTables', card.id, 'sheetName') as string;

            if (!webAppUrl || !sheetName) {
                console.error('Missing spreadsheet URL or sheet name');
                return;
            }

            // Fetch the updated table data
            const tableData = await fetchTableFromSheet(webAppUrl, sheetName);

            if (tableData) {
                // Get the table name from DataTables
                const tableName = store.getCell('DataTables', card.id, 'name') as string;
                const tinybaseTableId = `$${tableName}$`;

                // Update the table with new data
                store.setTable(tinybaseTableId, tableData);

                // Update the 'updated' timestamp
                store.setCell('DataTables', card.id, 'updated', Date.now());
            }
        } catch (error) {
            console.error('Error refreshing spreadsheet table:', error);
        } finally {
            setIsRefreshing(false);
        }
    };



    return (
        <Box
            ref={previewRef}
            onClick={() => onSelect(card.id)}
            sx={{
                position: 'absolute',
                left: card.x,
                top: card.y,
                //opacity: isDragging ? 0.5 : 1,
                cursor: isDragging ? 'grabbing' : 'pointer',
                zIndex: isDragging ? 1000 : (isSelected ? 100 : 1),
                margin: 0,
                padding: 0,
                width: card.width,
                height: card.height,
            }}
        >
            <ResizableBox
                width={card.width}
                height={card.height}
                minConstraints={[200, 60]}
                maxConstraints={[maxWidth, 600]}
                onResize={handleResizing}
                onResizeStart={handleResizeStart}
                onResizeStop={handleResizeStop}
                resizeHandles={['e', 'w', 'se', 'sw', 'n', 's', 'ne', 'nw']}
                style={{ margin: 0, padding: 0 }}
            >
                <Card
                    sx={{
                        width: '100%',
                        height: '100%',
                        border: '2px solid',
                        borderColor: isSelected ? 'primary.main' : 'divider',
                        margin: 0,
                        padding: 0,
                        boxShadow: isSelected ? 3 : 1,
                        '&:hover': {
                            borderColor: 'primary.main',
                        },
                    }}
                >
                    <CardHeader
                        title={
                            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                                <Typography variant="h6" component="div">
                                    {card.title}
                                </Typography>
                                {card.type === 'Manual' ? (
                                    <ManualTableIcon size={20} />
                                ) : card.type === 'Google Spreadsheet' ? (
                                    <Tooltip title="Open Spreadsheet" arrow>
                                        <span>
                                            <IconButton
                                                size="small"
                                                aria-label="open spreadsheet"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    const ssUrl = store?.getCell('DataTables', card.id, 'ssUrl');
                                                    if (ssUrl) {
                                                        window.open(ssUrl as string, '_blank', 'noopener,noreferrer');
                                                    }
                                                }}
                                            >
                                                <SpreadsheetTableIcon />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                ) : null}
                            </Box>
                        }
                        action={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {card.type === 'Google Spreadsheet' && (
                                    <Tooltip title="Fetch Table" arrow>
                                        <span>
                                            <IconButton
                                                size="small"
                                                aria-label="renew sheet"
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    refreshSpreadsheetTable();
                                                }}
                                                disabled={isRefreshing}
                                            >
                                                <Autorenew
                                                    sx={{
                                                        animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                                                        '@keyframes spin': {
                                                            '0%': {
                                                                transform: 'rotate(0deg)',
                                                            },
                                                            '100%': {
                                                                transform: 'rotate(360deg)',
                                                            },
                                                        },
                                                    }}
                                                />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                )}
                                <IconButton
                                    ref={dragRef}
                                    size="small"
                                    sx={{
                                        cursor: 'grab',
                                        '&:active': { cursor: 'grabbing' }
                                    }}
                                    aria-label="drag"
                                >
                                    <DragIndicator />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    aria-label="delete table"
                                    onClick={e => {
                                        e.stopPropagation();
                                        setDeleteDialogOpen(true);
                                    }}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </Box>
                        }
                        sx={{
                            pb: 1,
                            '& .MuiCardHeader-action': {
                                alignSelf: 'center',
                                mt: 0,
                            }
                        }}
                    />
                    <CardContent sx={{ pt: 0 }}>
                        {card.type === 'Manual' ? (
                            <ManualTable tableId={card.id} />
                        ) : card.type === 'Google Spreadsheet' ? (
                            <SpreadsheetTable tableId={card.id} />
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                Table content will go here. This is a placeholder for the actual table data
                                that will be implemented in the next step.
                            </Typography>
                        )}
                    </CardContent>
                </Card>
                {/* Delete confirmation dialog */}
                <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                    <DialogTitle>Delete Table</DialogTitle>
                    <DialogContent>
                        <Typography>Are you sure you want to delete the table "{card.title}"?</Typography>
                        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                            This action cannot be undone and will delete all data in this table.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                        <Button color="error" variant="contained" onClick={() => {
                            setDeleteDialogOpen(false);
                            onDeleteTable(card.id);
                        }}>Delete</Button>
                    </DialogActions>
                </Dialog>
            </ResizableBox>
        </Box>
    );
};

export default TableCard;
