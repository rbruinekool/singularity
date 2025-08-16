import React, { useState, useEffect } from 'react';
import { Box, Divider } from '@mui/material';
import { useCell, useHasTable, useTable, useStore, useAddRowCallback } from 'tinybase/ui-react';
import Rundown from './rundown/rundown';
import SingularControlPanel from './controls/singular/singular-control-panel';
import RundownTabs from './components/rundown-tabs';

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
    const [activeRundownId, setActiveRundownId] = useState<string>('');
    
    // TinyBase hooks for rundowns table
    const store = useStore();
    const hasRundownsTable = useHasTable('rundowns');
    const rundownsTable = useTable('rundowns') || {};
    
    // Use TinyBase hook to add initial rundown
    const addInitialRundownCallback = useAddRowCallback(
        'rundowns',
        () => ({ name: 'Main' }),
        [],
        undefined,
        (rundownId) => {
            // Set this as the active rundown once created
            if (rundownId && !activeRundownId) {
                setActiveRundownId(rundownId);
            }
        }
    );
    
    // Initialize rundowns table if it doesn't exist
    useEffect(() => {
        if (!hasRundownsTable && store && Object.keys(rundownsTable).length === 0) {
            addInitialRundownCallback();
        } else if (hasRundownsTable && Object.keys(rundownsTable).length > 0 && !activeRundownId) {
            // If table exists but no active rundown is set, set the first one
            const firstRundownId = Object.keys(rundownsTable)[0];
            setActiveRundownId(firstRundownId);
        }
    }, [hasRundownsTable, store, rundownsTable, activeRundownId, addInitialRundownCallback]);
    
    // Convert rundowns table to array format for RundownTabs component
    const rundowns = Object.entries(rundownsTable).map(([id, data]) => ({
        id,
        name: (data as { name: string }).name
    }));
    
    // Get row type using TinyBase hook
    const rowType = useCell('rundown-1', selectedRowId || '', 'type') as string;

    const handleRowDelete = (deletedRowId: string) => {
        // Clear selection if the deleted row was selected
        if (selectedRowId === deletedRowId) {
            setSelectedRowId(null);
        }
    };

    const handleRundownSelect = (rundownId: string) => {
        setActiveRundownId(rundownId);
        setSelectedRowId(null); // Clear selection when switching rundowns
    };

    // Use TinyBase hook to add new rundown
    const addRundownCallback = useAddRowCallback(
        'rundowns',
        (name: string) => {
            // Return the row data for the new rundown
            return { name };
        },
        [],
        undefined,
        (rundownId) => {
            // After successful addition, switch to the new rundown
            if (rundownId) {
                setActiveRundownId(rundownId);
                setSelectedRowId(null);
            }
        }
    );

    const handleRundownAdd = (name: string) => {
        // Check if name already exists (case-insensitive)
        if (rundowns.some(r => r.name.toLowerCase() === name.toLowerCase())) {
            return; // Don't add duplicate
        }
        
        // Use the TinyBase callback to add the rundown
        addRundownCallback(name);
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
                <RundownTabs
                    rundowns={rundowns}
                    activeRundownId={activeRundownId}
                    onRundownSelect={handleRundownSelect}
                    onRundownAdd={handleRundownAdd}
                />
                <Rundown
                    rundownId={activeRundownId}
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