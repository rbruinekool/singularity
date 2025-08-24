import React, { useState, useCallback, useEffect } from 'react';
import { Box } from '@mui/material';
import { useDrop } from 'react-dnd';
import TableCard from './table-card';
import { useStore, useRowIds } from 'tinybase/ui-react';

export interface TableCardData {
    id: string;
    title: string;
    width: number;
    height: number;
    x: number;
    y: number;
    isSelected?: boolean;
    type?: string;
}

interface TableCardGridProps {
    searchFilter: string;
}

const TableCardGrid: React.FC<TableCardGridProps> = ({ searchFilter }) => {
    // TinyBase hooks
    const store = useStore();
    const tableRowIds = useRowIds('DataTables') || [];

    // Add card to grid when table is added
    useEffect(() => {
        // Sync cards with TinyBase DataTables using direct store.getCell calls (investigate replacing with useCell)
        const newCards = tableRowIds.map(id => {
            const name = String(store?.getCell('DataTables', id, 'name') ?? '');
            const type = String(store?.getCell('DataTables', id, 'type') ?? '');
            const x = Number(store?.getCell('DataTables', id, 'x') ?? 20);
            const y = Number(store?.getCell('DataTables', id, 'y') ?? 20);
            const width = Number(store?.getCell('DataTables', id, 'width') ?? 400);
            const height = Number(store?.getCell('DataTables', id, 'height') ?? 300);
            return {
                id,
                title: name,
                width,
                height,
                x,
                y,
                type,
            };
        });
        setCards(newCards);
    }, [tableRowIds]);
    // Start with no cards
    const [cards, setCards] = useState<TableCardData[]>([]);
    
    const [snapGuides, setSnapGuides] = useState<{ x?: number; y?: number }>({});
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);

    // Track container width for proper snap guide rendering
    useEffect(() => {
        const updateContainerWidth = () => {
            // Calculate available container width (screen width minus page and grid padding)
            const totalPadding = 40 * 2; // 40px per side (Tables page + grid padding)
            const availableWidth = window.innerWidth - totalPadding;
            setContainerWidth(availableWidth);
        };
        
        updateContainerWidth();
        window.addEventListener('resize', updateContainerWidth);
        return () => window.removeEventListener('resize', updateContainerWidth);
    }, []);

    const filteredCards = cards.filter(card => 
        card.title.toLowerCase().includes(searchFilter.toLowerCase())
    );

    const selectCard = useCallback((id: string) => {
        setSelectedCardId(id);
    }, []);

    const deselectAll = useCallback((e: React.MouseEvent) => {
        // Only deselect if clicking directly on the container, not on a card
        if (e.target === e.currentTarget) {
            setSelectedCardId(null);
        }
    }, []);

    const moveCard = useCallback((id: string, x: number, y: number) => {
        setCards(prevCards => {
            const otherCards = prevCards.filter(card => card.id !== id);
            const currentCard = prevCards.find(card => card.id === id);
            if (!currentCard) return prevCards;
            const snapThreshold = 15;
            const snapGap = 8;
            let snappedX = x;
            let snappedY = y;
            for (const otherCard of otherCards) {
                if (Math.abs(y - otherCard.y) < snapThreshold) {
                    snappedY = otherCard.y;
                    break;
                }
                const otherCardHeight = otherCard.height;
                const otherCardBottom = otherCard.y + otherCardHeight;
                if (Math.abs(y - otherCardBottom) < snapThreshold) {
                    snappedY = otherCardBottom + snapGap;
                    break;
                }
            }
            for (const otherCard of otherCards) {
                if (Math.abs(x - otherCard.x) < snapThreshold) {
                    snappedX = otherCard.x;
                    break;
                }
                const otherCardRight = otherCard.x + otherCard.width;
                if (Math.abs(x - otherCardRight) < snapThreshold) {
                    snappedX = otherCardRight + snapGap;
                    break;
                }
                const currentCardRight = x + currentCard.width;
                if (Math.abs(currentCardRight - otherCard.x) < snapThreshold) {
                    snappedX = otherCard.x - currentCard.width - snapGap;
                    break;
                }
                if (Math.abs(currentCardRight - otherCardRight) < snapThreshold) {
                    snappedX = otherCardRight - currentCard.width;
                    break;
                }
            }
            // Update TinyBase DataTables with new position
            if (store) {
                store.setCell('DataTables', id, 'x', snappedX);
                store.setCell('DataTables', id, 'y', snappedY);
            }
            return prevCards.map(card => 
                card.id === id ? { ...card, x: snappedX, y: snappedY } : card
            );
        });
    }, []);

    const resizeCard = useCallback((id: string, width: number, height: number) => {
        setCards(prevCards => {
            const otherCards = prevCards.filter(card => card.id !== id);
            const currentCard = prevCards.find(card => card.id === id);
            if (!currentCard) return prevCards;
            const snapThreshold = 15;
            const snapGap = 8;
            let snappedWidth = width;
            let snappedHeight = height;
            for (const otherCard of otherCards) {
                const targetWidthWithGap = otherCard.x - currentCard.x - snapGap;
                if (targetWidthWithGap > 0 && Math.abs(width - targetWidthWithGap) < snapThreshold) {
                    snappedWidth = targetWidthWithGap;
                    break;
                }
                const otherCardRight = otherCard.x + otherCard.width;
                const targetWidthToRight = otherCardRight - currentCard.x;
                if (targetWidthToRight > 0 && Math.abs(width - targetWidthToRight) < snapThreshold) {
                    snappedWidth = targetWidthToRight;
                    break;
                }
                const targetWidthDirect = otherCard.x - currentCard.x;
                if (targetWidthDirect > 0 && Math.abs(width - targetWidthDirect) < snapThreshold) {
                    snappedWidth = targetWidthDirect;
                    break;
                }
            }
            for (const otherCard of otherCards) {
                const targetHeightWithGap = otherCard.y - currentCard.y - snapGap;
                if (targetHeightWithGap > 0 && Math.abs(height - targetHeightWithGap) < snapThreshold) {
                    snappedHeight = targetHeightWithGap;
                    break;
                }
                const otherCardBottom = otherCard.y + otherCard.height;
                const targetHeightToBottom = otherCardBottom - currentCard.y;
                if (targetHeightToBottom > 0 && Math.abs(height - targetHeightToBottom) < snapThreshold) {
                    snappedHeight = targetHeightToBottom;
                    break;
                }
                const targetHeightDirect = otherCard.y - currentCard.y;
                if (targetHeightDirect > 0 && Math.abs(height - targetHeightDirect) < snapThreshold) {
                    snappedHeight = targetHeightDirect;
                    break;
                }
            }
            // Update TinyBase DataTables with new size
            if (store) {
                store.setCell('DataTables', id, 'width', snappedWidth);
                store.setCell('DataTables', id, 'height', snappedHeight);
            }
            return prevCards.map(card => 
                card.id === id ? { ...card, width: snappedWidth, height: snappedHeight } : card
            );
        });
    }, []);

    const previewResize = useCallback((id: string, width: number, height: number) => {
        const otherCards = cards.filter(card => card.id !== id);
        const currentCard = cards.find(card => card.id === id);
        
        if (!currentCard) return;
        
        // Calculate snap guides for resize preview
        const snapThreshold = 15;
        const snapGap = 8;
        let guideX: number | undefined;
        let guideY: number | undefined;
        
        // Check for width snap guides
        for (const otherCard of otherCards) {
            // Right edge to left edge (with gap)
            const targetWidthWithGap = otherCard.x - currentCard.x - snapGap;
            if (targetWidthWithGap > 0 && Math.abs(width - targetWidthWithGap) < snapThreshold) {
                guideX = currentCard.x + targetWidthWithGap;
                break;
            }
            
            // Right edge to right edge
            const otherCardRight = otherCard.x + otherCard.width;
            const targetWidthToRight = otherCardRight - currentCard.x;
            if (targetWidthToRight > 0 && Math.abs(width - targetWidthToRight) < snapThreshold) {
                guideX = otherCardRight;
                break;
            }
            
            // Right edge to left edge (direct)
            const targetWidthDirect = otherCard.x - currentCard.x;
            if (targetWidthDirect > 0 && Math.abs(width - targetWidthDirect) < snapThreshold) {
                guideX = otherCard.x;
                break;
            }
        }
        
        // Check for height snap guides
        for (const otherCard of otherCards) {
            // Bottom edge to top edge (with gap)
            const targetHeightWithGap = otherCard.y - currentCard.y - snapGap;
            if (targetHeightWithGap > 0 && Math.abs(height - targetHeightWithGap) < snapThreshold) {
                guideY = currentCard.y + targetHeightWithGap;
                break;
            }
            
            // Bottom edge to bottom edge
            const otherCardBottom = otherCard.y + otherCard.height;
            const targetHeightToBottom = otherCardBottom - currentCard.y;
            if (targetHeightToBottom > 0 && Math.abs(height - targetHeightToBottom) < snapThreshold) {
                guideY = otherCardBottom;
                break;
            }
            
            // Bottom edge to top edge (direct)
            const targetHeightDirect = otherCard.y - currentCard.y;
            if (targetHeightDirect > 0 && Math.abs(height - targetHeightDirect) < snapThreshold) {
                guideY = otherCard.y;
                break;
            }
        }
        
        setSnapGuides({ x: guideX, y: guideY });
    }, [cards]);

    const clearResizeGuides = useCallback(() => {
        setSnapGuides({});
    }, []);

    const [, drop] = useDrop({
        accept: 'table-card',
        hover: (item: { id: string; left: number; top: number }, monitor) => {
            const delta = monitor.getDifferenceFromInitialOffset();
            if (delta) {
                const x = Math.max(0, Math.round(item.left + delta.x));
                const y = Math.max(0, Math.round(item.top + delta.y));
                
                // Get current card info for edge calculations
                const currentCard = cards.find(card => card.id === item.id);
                if (!currentCard) return;
                
                // Calculate snap guides during hover
                const otherCards = cards.filter(card => card.id !== item.id);
                const snapThreshold = 15;
                const snapGap = 8; // Same gap as in moveCard
                let guideX: number | undefined;
                let guideY: number | undefined;
                
                // Check for horizontal snap guides
                for (const otherCard of otherCards) {
                    // Top edge alignment - show where top edge will be
                    if (Math.abs(y - otherCard.y) < snapThreshold) {
                        guideY = otherCard.y;
                        break;
                    }
                    // Bottom edge alignment - show where top edge will be (with gap)
                    const otherCardHeight = otherCard.height;
                    const otherCardBottom = otherCard.y + otherCardHeight;
                    if (Math.abs(y - otherCardBottom) < snapThreshold) {
                        guideY = otherCardBottom + snapGap;
                        break;
                    }
                }
                
                // Check for vertical snap guides
                for (const otherCard of otherCards) {
                    // Left edge to left edge - show where left edge will be
                    if (Math.abs(x - otherCard.x) < snapThreshold) {
                        guideX = otherCard.x;
                        break;
                    }
                    // Left edge to right edge - show where left edge will be
                    const otherCardRight = otherCard.x + otherCard.width;
                    if (Math.abs(x - otherCardRight) < snapThreshold) {
                        guideX = otherCardRight + snapGap;
                        break;
                    }
                    // Right edge to left edge - show where right edge will be
                    const currentCardRight = x + currentCard.width;
                    if (Math.abs(currentCardRight - otherCard.x) < snapThreshold) {
                        guideX = otherCard.x - snapGap; // This is where the right edge will be
                        break;
                    }
                    // Right edge to right edge - show where right edge will be
                    if (Math.abs(currentCardRight - otherCardRight) < snapThreshold) {
                        guideX = otherCardRight;
                        break;
                    }
                }
                
                setSnapGuides({ x: guideX, y: guideY });
            }
        },
        drop: (item: { id: string; left: number; top: number }, monitor) => {
            const delta = monitor.getDifferenceFromInitialOffset();
            if (delta) {
                const x = Math.max(0, Math.round(item.left + delta.x));
                const y = Math.max(0, Math.round(item.top + delta.y));
                moveCard(item.id, x, y);
            }
            // Clear snap guides after drop
            setSnapGuides({});
        },
    });

    const dropRef = React.useRef<HTMLDivElement>(null);
    drop(dropRef);

    // Delete table and corresponding DataTables row
    const handleDeleteTable = useCallback((tableId: string) => {
        if (!store) return;
        // Get the table name from DataTables
        const row = tableRowIds.find(id => id === tableId);
        if (!row) return;
        const tableName = store.getCell('DataTables', row, 'name');
        if (!tableName) return;
        const tinybaseTableId = `$${tableName}$`;
        store.transaction(() => {
            store.delTable(tinybaseTableId);
            store.delRow('DataTables', row);
        });
        // Optionally, update cards state to remove the deleted card immediately
        setCards(prev => prev.filter(card => card.id !== tableId));
    }, [store, tableRowIds]);

    return (
        <>
            <Box
                ref={dropRef}
                onClick={deselectAll}
                sx={{
                    position: 'relative',
                    width: '100%',
                    height: '90%',
                    maxWidth: '100%',
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 2,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    boxSizing: 'border-box',
                    m: 0,
                    p: 0,
                }}
            >
                {/* Snap guides - add offset to account for react-resizable handles */}
                {snapGuides.x !== undefined && (
                    <Box
                        sx={{
                            position: 'absolute',
                            left: snapGuides.x, // Remove the +16 offset
                            top: 0,
                            width: '2px',
                            height: '100%',
                            backgroundColor: 'primary.main',
                            opacity: 0.7,
                            zIndex: 999,
                            pointerEvents: 'none',
                        }}
                    />
                )}
                {snapGuides.y !== undefined && (
                    <Box
                        sx={{
                            position: 'absolute',
                            left: 0,
                            top: snapGuides.y, // Remove the +16 offset
                            width: containerWidth > 0 ? `${containerWidth}px` : '100%',
                            height: '2px',
                            backgroundColor: 'primary.main',
                            opacity: 0.7,
                            zIndex: 999,
                            pointerEvents: 'none',
                        }}
                    />
                )}
                {filteredCards.map((card) => (
                    card.type === 'Manual' ? (
                        <TableCard
                            key={card.id}
                            card={card}
                            isSelected={selectedCardId === card.id}
                            onMove={moveCard}
                            onResize={resizeCard}
                            onResizePreview={previewResize}
                            onResizeEnd={clearResizeGuides}
                            onSelect={selectCard}
                            onDeleteTable={handleDeleteTable}
                        />
                    ) : null
                ))}
            </Box>
        </>
    );
};

export default TableCardGrid;
