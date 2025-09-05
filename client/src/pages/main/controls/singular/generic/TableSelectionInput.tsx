import React from 'react';
import { Box, Button, Autocomplete, TextField } from '@mui/material';
import TableViewIcon from '@mui/icons-material/TableView';
import { useSetPayloadValue } from '../hooks/usePayload';

interface TableSelectionInputProps {
    rundownId: string;
    rowId: string;
    modelId: string;
    currentValue: string;
    selectedTable: string | null;
    selectedColumn: string | null;
    options: string[];
    onConfigure: () => void;
}

const TableSelectionInput: React.FC<TableSelectionInputProps> = ({
    rundownId,
    rowId,
    modelId,
    currentValue,
    selectedTable,
    selectedColumn,
    options,
    onConfigure
}) => {
    const setPayloadValue = useSetPayloadValue(rundownId, rowId, modelId);

    return (
        <Box sx={{ width: '100%' }}>
            {selectedTable && selectedColumn ? (
                <Autocomplete
                    size="small"
                    options={options}
                    value={currentValue || null}
                    onChange={(_, newValue) => {
                        setPayloadValue(newValue || '');
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            placeholder="Select a value"
                        />
                    )}
                    fullWidth
                />
            ) : (
                <Button
                    variant="outlined"
                    onClick={onConfigure}
                    startIcon={<TableViewIcon />}
                    size="small"
                    fullWidth
                >
                    Configure Table Selection
                </Button>
            )}
        </Box>
    );
};

export default TableSelectionInput;
