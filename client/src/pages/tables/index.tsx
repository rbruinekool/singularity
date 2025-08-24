import React, { useState } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Box } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import TableCardGrid from './components/table-card-grid';
import { useAddRowCallback, useStore } from 'tinybase/ui-react';

const Tables: React.FC = () => {
    const [searchFilter, setSearchFilter] = useState('');
    // Add Table dialog state
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newTableName, setNewTableName] = useState('');
    const [newTableType, setNewTableType] = useState('Manual');
    const store = useStore();

    // Helper: check if table name exists
    const isTableNameTaken = (name: string) => {
        return store?.getRowIds('DataTables').some(id => store?.getCell('DataTables', id, 'name') === name);
    };


    // Add table callback
    const addTable = useAddRowCallback(
        'DataTables',
        () => {
            const newName = newTableName.trim();
            // Create a new table with the pattern _TableName_
            if (store && newTableType === 'Manual') {
                const tinybaseTableId = `_${newName}_`;
                store.transaction(() => {
                    // Initialize with empty headers row
                    store.setRow(tinybaseTableId, '__headers__', {});
                });
            }

            return {
                name: newName,
                type: newTableType,
                updated: Date.now(),
                x: 20,
                y: 20,
                width: 400,
                height: 300,
            };
        },
        [newTableName, newTableType, store]
    );

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
                <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <TextField
                        fullWidth
                        variant="outlined"
                        placeholder="Filter tables by name..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        sx={{ mb: 3, maxWidth: 400, flexShrink: 0 }}
                    />
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setAddDialogOpen(true)}
                            sx={{ backgroundColor: 'primary.main', '&:hover': { backgroundColor: 'primary.dark' } }}
                        >
                            Add Table
                        </Button>
                    </Box>

                </Box>
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <TableCardGrid searchFilter={searchFilter} />
                </Box>
            </Box>
            {/* Add Table Dialog */}
            <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add New Table</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Table Name"
                        fullWidth
                        variant="outlined"
                        value={newTableName}
                        onChange={e => setNewTableName(e.target.value)}
                        error={newTableName.trim() !== '' && isTableNameTaken(newTableName.trim())}
                        helperText={
                            newTableName.trim() !== '' && isTableNameTaken(newTableName.trim())
                                ? "A table with this name already exists"
                                : "Enter a unique table name"
                        }
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        select
                        label="Table Type"
                        value={newTableType}
                        onChange={e => setNewTableType(e.target.value)}
                        fullWidth
                        sx={{ mb: 2 }}
                    >
                        <MenuItem value="Manual">Manual</MenuItem>
                        <MenuItem value="Google Spreadsheet" disabled>Google Spreadsheet (coming soon)</MenuItem>
                    </TextField>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={() => {
                            if (!newTableName.trim() || isTableNameTaken(newTableName.trim())) return;
                            addTable();
                            setAddDialogOpen(false);
                            setNewTableName('');
                            setNewTableType('Manual');
                        }}
                        variant="contained"
                        disabled={!newTableName.trim() || isTableNameTaken(newTableName.trim())}
                    >
                        Add Table
                    </Button>
                </DialogActions>
            </Dialog>
        </DndProvider>
    );
};

export default Tables;
