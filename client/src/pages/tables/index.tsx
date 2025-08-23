import React, { useState } from 'react';
import { Box, TextField, Typography } from '@mui/material';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import TableCardGrid from './components/table-card-grid';

const Tables: React.FC = () => {
    const [searchFilter, setSearchFilter] = useState('');

    return (
        <DndProvider backend={HTML5Backend}>
            <Box sx={{
                p: 3,
                maxWidth: '100vw',
                height: '100vh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
            }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Filter tables by name..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    sx={{ mb: 3, maxWidth: 400, flexShrink: 0 }}
                />
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <TableCardGrid searchFilter={searchFilter} />
                </Box>
            </Box>
        </DndProvider>
    );
};

export default Tables;
