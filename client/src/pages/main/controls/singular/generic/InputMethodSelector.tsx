import React, { useEffect } from 'react';
import {
    Box, Typography, TextField, Autocomplete, Dialog,
    DialogTitle, DialogContent, DialogActions, Button, Tooltip
} from '@mui/material';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ListAltIcon from '@mui/icons-material/ListAlt';
import TableViewIcon from '@mui/icons-material/TableView';

interface TableSelection {
    tableId: string;
    tableName: string;
    columns: string[];
}

// Define the possible input modes
type InputMode = 'manual' | 'default' | 'table';

interface InputMethodSelectorProps {
    inputMethodDialogOpen: boolean;
    setInputMethodDialogOpen: (open: boolean) => void;
    inputMode: InputMode;
    modelType: string;
    handleInputModeChange: (mode: InputMode) => void;
    showTableConfig: boolean;
    setShowTableConfig: (show: boolean) => void;
    tempTableId: string | null;
    setTempTableId: (tableId: string | null) => void;
    tempColumnName: string | null;
    setTempColumnName: (columnName: string | null) => void;
    tempTableColumns: string[];
    setTempTableColumns: (columns: string[]) => void;
    availableTables: TableSelection[];
    handleSaveTableConfig: () => void;
}

const InputMethodSelector: React.FC<InputMethodSelectorProps> = ({
    inputMethodDialogOpen,
    setInputMethodDialogOpen,
    inputMode,
    modelType,
    handleInputModeChange,
    showTableConfig,
    setShowTableConfig,
    tempTableId,
    setTempTableId,
    tempColumnName,
    setTempColumnName,
    tempTableColumns,
    setTempTableColumns,
    availableTables,
    handleSaveTableConfig
}) => {
    const getMethodBoxStyles = (mode: InputMode) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid',
        borderColor: inputMode === mode ? 'primary.main' : 'divider',
        borderRadius: 1,
        p: 1.5,
        cursor: 'pointer',
        position: 'relative',
        backgroundColor: inputMode === mode ? 'action.selected' : 'background.paper',
        '&:hover': {
            backgroundColor: 'action.hover',
        },
        width: '90px',
        height: '70px',
    });

    // Only show the selection option if the model type is selection
    const showSelectionOption = modelType === 'selection';

    // Reset to method selection
    const handleBackToMethodSelection = () => {
        setShowTableConfig(false);
    };

    // Update temp columns when table changes
    useEffect(() => {
        if (tempTableId) {
            const selectedTableInfo = availableTables.find(t => t.tableId === tempTableId);
            if (selectedTableInfo) {
                setTempTableColumns(selectedTableInfo.columns);
            }
        } else {
            setTempTableColumns([]);
        }
    }, [tempTableId, availableTables, setTempTableColumns]);

    return (
        <Dialog
            open={inputMethodDialogOpen}
            onClose={() => setInputMethodDialogOpen(false)}
            maxWidth="xs"
            fullWidth
        >
            {!showTableConfig ? (
                // Show method selection options
                <>
                    <DialogTitle>Select Input Method</DialogTitle>
                    <DialogContent>
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, p: 1 }}>
                            <Box
                                sx={getMethodBoxStyles('manual')}
                                onClick={() => handleInputModeChange('manual')}
                            >
                                <TextFieldsIcon sx={{ fontSize: '24px' }} />
                                <Typography variant="caption" sx={{ mt: 0.5 }}>Text</Typography>
                                <Tooltip title="Enter text directly">
                                    <span style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}></span>
                                </Tooltip>
                            </Box>

                            {showSelectionOption && (
                                <Box
                                    sx={getMethodBoxStyles('default')}
                                    onClick={() => handleInputModeChange('default')}
                                >
                                    <ListAltIcon sx={{ fontSize: '24px' }} />
                                    <Typography variant="caption" sx={{ mt: 0.5 }}>Selection</Typography>
                                    <Tooltip title="Select from predefined values">
                                        <span style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}></span>
                                    </Tooltip>
                                </Box>
                            )}

                            <Box
                                sx={getMethodBoxStyles('table')}
                                onClick={() => handleInputModeChange('table')}
                            >
                                <TableViewIcon sx={{ fontSize: '24px' }} />
                                <Typography variant="caption" sx={{ mt: 0.5 }}>Table</Typography>
                                <Tooltip title="Select from table data">
                                    <span style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}></span>
                                </Tooltip>
                            </Box>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setInputMethodDialogOpen(false)}>Cancel</Button>
                    </DialogActions>
                </>
            ) : (
                // Show table configuration
                <>
                    <DialogTitle>Configure Table Selection</DialogTitle>
                    <DialogContent>
                        <Box sx={{ p: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Select a Table
                            </Typography>
                            <Autocomplete
                                options={availableTables}
                                getOptionLabel={(option) => option.tableName}
                                value={availableTables.find(t => t.tableId === tempTableId) || null}
                                onChange={(_, newValue) => {
                                    setTempTableId(newValue?.tableId || null);
                                    setTempColumnName(null); // Reset column when table changes
                                }}
                                renderInput={(params) => (
                                    <TextField {...params} placeholder="Select a table" size="small" />
                                )}
                                fullWidth
                                size="small"
                            />

                            <Typography variant="subtitle2" sx={{ mt: 2 }} gutterBottom>
                                Select a Column
                            </Typography>
                            <Autocomplete
                                options={tempTableColumns}
                                value={tempColumnName}
                                onChange={(_, newValue) => {
                                    setTempColumnName(newValue);
                                }}
                                renderInput={(params) => (
                                    <TextField {...params} placeholder="Select a column" size="small" />
                                )}
                                disabled={!tempTableId}
                                fullWidth
                                size="small"
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleBackToMethodSelection}>Back</Button>
                        <Button
                            onClick={handleSaveTableConfig}
                            disabled={!tempTableId || !tempColumnName}
                            variant="contained"
                        >
                            Save
                        </Button>
                    </DialogActions>
                </>
            )}
        </Dialog>
    );
};

export default InputMethodSelector;
