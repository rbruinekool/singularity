import React, { useState } from 'react';
import { Box, Divider } from '@mui/material';
import { useCell } from 'tinybase/ui-react';
import Rundown from './rundown/rundown';
import SingularControlPanel from './controls/singular/singular-control-panel';

interface SelectedRowData {
    rowId: string;
    data: Record<string, any>;
}

const Main: React.FC = () => {
    const [dividerPosition, setDividerPosition] = useState(() => {
        const saved = localStorage.getItem('dividerPosition');
        return saved ? Number(saved) : 50;
    }); // Divider position as a percentage

    const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
    
    // Get row type using TinyBase hook
    const rowType = useCell('rundown-1', selectedRowId || '', 'type') as string;

    const handleRowDelete = (deletedRowId: string) => {
        // Clear selection if the deleted row was selected
        if (selectedRowId === deletedRowId) {
            setSelectedRowId(null);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const startX = e.clientX;
        const startDividerPosition = dividerPosition;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const newDividerPosition = Math.min(Math.max(startDividerPosition + (deltaX / window.innerWidth) * 100, 10), 90);
            setDividerPosition(newDividerPosition);
            localStorage.setItem('dividerPosition', String(newDividerPosition));
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <Box display="flex" height="100vh" width="100vw">
            <Box
                flex={`0 0 ${dividerPosition}%`}
                display="flex"
                flexDirection="column"
                overflow="hidden"
            >
                <Rundown
                    selectedRowId={selectedRowId}
                    onRowSelect={setSelectedRowId}
                    onRowDelete={handleRowDelete}
                />
            </Box>
            <Divider
                orientation="vertical"
                onMouseDown={handleMouseDown}
                sx={{
                    cursor: 'col-resize',
                    width: '1px',
                    backgroundColor: '#eee',
                }}
            />
            <Box flex={`0 0 ${100 - dividerPosition}%`} overflow="hidden">
                {selectedRowId ? (
                    <>
                        {rowType === 'subcomposition' ? (
                            <SingularControlPanel rundownId={'rundown-1'} rowId={selectedRowId} />
                        ) : (
                            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <div>Unknown row type: {rowType}</div>
                            </Box>
                        )}
                    </>
                ) : (
                    <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <div>Select A Row on the Rundown</div>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default Main;