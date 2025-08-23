import React, { useRef, useEffect, useState } from 'react';
import { Box, Card, CardContent, CardHeader, IconButton, Typography } from '@mui/material';
import { DragIndicator } from '@mui/icons-material';
import { useDrag } from 'react-dnd';
import { ResizableBox } from 'react-resizable';
import { TableCardData } from './table-card-grid';
import 'react-resizable/css/styles.css';
import ManualTable from './manual-table';

interface TableCardProps {
    card: TableCardData;
    isSelected: boolean;
    onMove: (id: string, x: number, y: number) => void;
    onResize: (id: string, width: number, height: number) => void;
    onResizePreview: (id: string, width: number, height: number) => void;
    onResizeEnd: () => void;
    onSelect: (id: string) => void;
}

const TableCard: React.FC<TableCardProps> = ({ 
    card, 
    isSelected,
    onResize,
    onResizePreview,
    onResizeEnd,
    onSelect
}) => {
    const dragRef = useRef<HTMLButtonElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);

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

    return (
        <Box
            ref={previewRef}
            onClick={() => onSelect(card.id)}
            sx={{
                position: 'absolute',
                left: card.x,
                top: card.y,
                opacity: isDragging ? 0.5 : 1,
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
                            <Typography variant="h6" component="div">
                                {card.title}
                            </Typography>
                        }
                        action={
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
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                Table content will go here. This is a placeholder for the actual table data
                                that will be implemented in the next step.
                            </Typography>
                        )}
                    </CardContent>
                </Card>
            </ResizableBox>
        </Box>
    );
};

export default TableCard;
