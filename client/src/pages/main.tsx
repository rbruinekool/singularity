import React, { useState } from 'react';
import { Box, Divider } from '@mui/material';
import Rundown from '../sections/rundown/rundown';

const Main: React.FC = () => {
    const [dividerPosition, setDividerPosition] = useState(() => {
        const saved = localStorage.getItem('dividerPosition');
        return saved ? Number(saved) : 50;
    }); // Divider position as a percentage

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
                <Rundown />
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
                {/* Placeholder for other content */}
            </Box>
        </Box>
    );
};

export default Main;