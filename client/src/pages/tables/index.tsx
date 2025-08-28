import React, { useState, useEffect } from 'react';
import {
    Button, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, Box, CircularProgress,
    Alert, Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import TableCardGrid from './table-card-grid';
import { useAddRowCallback, useStore } from 'tinybase/ui-react';
import fetchTableFromSheet from './api/fetch-table';

const Tables: React.FC = () => {
    const [searchFilter, setSearchFilter] = useState('');
    // Add Table dialog state
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newTableName, setNewTableName] = useState('');
    const [newTableType, setNewTableType] = useState('Manual');
    const [webAppUrl, setWebAppUrl] = useState('');
    const [ssUrl, setSsUrl] = useState('');
    const [availableSheets, setAvailableSheets] = useState<string[]>([]);
    const [selectedSheet, setSelectedSheet] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const store = useStore();

    // Reset form when dialog closes
    useEffect(() => {
        if (!addDialogOpen) {
            setNewTableName('');
            setNewTableType('Manual');
            setWebAppUrl('');
            setSsUrl('');
            setAvailableSheets([]);
            setSelectedSheet('');
            setErrorMessage('');
        }
    }, [addDialogOpen]);

    // Helper: check if table name exists
    const isTableNameTaken = (name: string) => {
        return store?.getRowIds('DataTables').some(id => store?.getCell('DataTables', id, 'name') === name);
    };

    // Validate URL
    const isValidUrl = (url: string) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    // Fetch available sheets from Google Apps Script Web App
    const fetchSheetInfo = async () => {
        if (!isValidUrl(webAppUrl)) {
            setErrorMessage('Please enter a valid URL');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');

        try {
            const response = await fetch(`${webAppUrl}?apiCall=getSheetNames`, {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const data = await response.json();

            if (data.sheetNames && Array.isArray(data.sheetNames)) {
                setAvailableSheets(data.sheetNames);
                setSsUrl(data.ssUrl);
                if (data.sheetNames.length > 0) {
                    setSelectedSheet(data.sheetNames[0]);
                }
            } else {
                throw new Error('Invalid response format: sheets array not found');
            }
        } catch (error) {
            console.error('Error fetching sheets:', error);
            setErrorMessage('Failed to fetch sheets. Make sure the URL is correct and the web app is deployed with proper CORS settings.');
            setAvailableSheets([]);
            setSelectedSheet('');
        } finally {
            setIsLoading(false);
        }
    };

    // Add a row to the DataTables row, which is metadata for the data tables
    const addDataTablesRow = useAddRowCallback(
        'DataTables',
        (_, store) => {
            const newName = newTableName.trim();

            // For Manual tables, we can initialize directly
            if (newTableType === 'Manual' && store) {
                const tinybaseTableId = `$${newName}$`;
                store.transaction(() => {
                    // Initialize with empty headers row
                    store.setRow(tinybaseTableId, '__headers__', {});
                });
            }

            // The base row that is added to the DataTables table
            const baseRow = {
                name: newName,
                type: newTableType,
                updated: Date.now(),
                x: 20,
                y: 20,
                width: newTableType === 'Google Spreadsheet' ? 600 : 400,
                height: newTableType === 'Google Spreadsheet' ? 400 : 300,
            };

            // Add specific metadata for Spreadsheet tables
            if (newTableType === 'Google Spreadsheet') {
                return {
                    ...baseRow,
                    ssUrl,
                    webAppUrl,
                    sheetName: selectedSheet,
                };
            }

            return baseRow;
        },
        [newTableName, newTableType, store, webAppUrl, selectedSheet]
    );

    // Separate function to handle the async operations for Google Spreadsheet tables
    const handleAddGoogleSpreadsheetTable = async (): Promise<boolean> => {
        const newName = newTableName.trim();
        const tinybaseTableId = `$${newName}$`;

        setIsLoading(true);
        setErrorMessage('');

        try {
            if (!isValidUrl(webAppUrl) || !selectedSheet) {
                return false;
            }
            // Fetch data from the selected sheet
            const data = await fetchTableFromSheet(webAppUrl, selectedSheet);

            if (!data) {
                setErrorMessage('Failed to fetch sheet data or data format is invalid');
                setIsLoading(false);
                return false;
            }
            if (!store) {
                setErrorMessage('Store not available');
                setIsLoading(false);
                return false;
            }

            // Set the full table
            store.setTable(tinybaseTableId, data);

            //Add the row of table metadata to DataTables
            addDataTablesRow();

            // Show success message
            setShowSuccessMessage(true);
            setIsLoading(false);
            return true;


        } catch (error) {
            console.error('Error setting up spreadsheet table:', error);
            setErrorMessage('Failed to set up spreadsheet table: ' + (error instanceof Error ? error.message : String(error)));
            setIsLoading(false);
            return false;
        }
    };

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
                        select
                        label="Table Type"
                        value={newTableType}
                        onChange={e => setNewTableType(e.target.value)}
                        fullWidth
                        sx={{ mt: 2, mb: 1 }}
                    >
                        <MenuItem value="Manual">Manual</MenuItem>
                        <MenuItem value="Google Spreadsheet">Google Spreadsheet</MenuItem>
                    </TextField>
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

                    {newTableType === 'Google Spreadsheet' && (
                        <>
                            <TextField
                                label="Google Apps Script Web App URL"
                                fullWidth
                                variant="outlined"
                                value={webAppUrl}
                                onChange={e => setWebAppUrl(e.target.value)}
                                placeholder="https://script.google.com/macros/s/..."
                                error={!!webAppUrl && !isValidUrl(webAppUrl)}
                                helperText={
                                    webAppUrl && !isValidUrl(webAppUrl)
                                        ? "Please enter a valid URL"
                                        : "Enter the URL of your Google Apps Script Web App"
                                }
                                sx={{ mb: 2 }}
                            />

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, gap: 1 }}>
                                <Button
                                    size='small'
                                    variant="outlined"
                                    onClick={fetchSheetInfo}
                                    disabled={!webAppUrl || !isValidUrl(webAppUrl) || isLoading}
                                    sx={{ flexGrow: 1, fontSize: '0.7rem' }}
                                >
                                    {isLoading ? <CircularProgress size={24} /> : 'Fetch Sheets'}
                                </Button>

                                <TextField
                                    select
                                    label="Sheet"
                                    value={selectedSheet}
                                    onChange={e => setSelectedSheet(e.target.value)}
                                    fullWidth
                                    disabled={availableSheets.length === 0}
                                    sx={{ flexGrow: 2 }}
                                >
                                    {availableSheets.map(sheet => (
                                        <MenuItem key={sheet} value={sheet}>
                                            {sheet}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Box>

                            {errorMessage && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {errorMessage}
                                </Alert>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={async () => {
                            if (!newTableName.trim() || isTableNameTaken(newTableName.trim())) return;

                            if (newTableType === 'Google Spreadsheet' && (!selectedSheet || !webAppUrl)) {
                                setErrorMessage('Please fetch and select a sheet first');
                                return;
                            }

                            let success = false;

                            if (newTableType === 'Google Spreadsheet') {
                                // Handle spreadsheet tables asynchronously
                                success = await handleAddGoogleSpreadsheetTable();
                            } else {
                                // Handle manual tables synchronously
                                addDataTablesRow();
                                success = true;
                            }

                            if (success) {
                                setAddDialogOpen(false);
                                setNewTableName('');
                                setNewTableType('Manual');
                                setWebAppUrl('');
                                setSelectedSheet('');
                                setAvailableSheets([]);
                                setErrorMessage('');
                            }
                        }}
                        variant="contained"
                        disabled={
                            !newTableName.trim() ||
                            isTableNameTaken(newTableName.trim()) ||
                            (newTableType === 'Google Spreadsheet' && (!selectedSheet || !webAppUrl)) ||
                            isLoading
                        }
                    >
                        {isLoading ? <CircularProgress size={24} /> : 'Add Table'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Success message */}
            <Snackbar
                open={showSuccessMessage}
                autoHideDuration={6000}
                onClose={() => setShowSuccessMessage(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setShowSuccessMessage(false)} severity="success">
                    Google Spreadsheet table imported successfully!
                </Alert>
            </Snackbar>
        </DndProvider>
    );
};

export default Tables;
