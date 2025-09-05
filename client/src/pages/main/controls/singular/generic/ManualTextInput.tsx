import React, { useState, useEffect } from 'react';
import { Box, TextField, Typography } from '@mui/material';
import { useStore } from 'tinybase/ui-react';
import { replaceCustomVariables } from '../singular-controls/variables';
import { useSetPayloadValue } from '../hooks/usePayload';

interface ManualTextInputProps {
    rundownId: string;
    rowId: string;
    modelId: string;
    currentValue: string;
}

const ManualTextInput: React.FC<ManualTextInputProps> = ({
    rundownId,
    rowId,
    modelId,
    currentValue
}) => {
    const store = useStore();
    const setPayloadValue = useSetPayloadValue(rundownId, rowId, modelId);
    const [textValue, setTextValue] = useState(currentValue || '');
    const [submittedValue, setSubmittedValue] = useState(currentValue || '');
    const [preview, setPreview] = useState('');

    // Update preview only when submittedValue changes
    useEffect(() => {
        if (submittedValue && store) {
            const processedValue = replaceCustomVariables(store.getTable('variables'), submittedValue);
            setPreview(processedValue);
        } else {
            setPreview('');
        }
    }, [submittedValue, store]);

    // Handle text field change - only update local state
    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setTextValue(newValue);
    };

    // Save value when field loses focus
    const handleBlur = () => {
        setPayloadValue(textValue);
        setSubmittedValue(textValue);
    };

    // Save value when Enter key is pressed
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            setPayloadValue(textValue);
            setSubmittedValue(textValue);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <TextField
                size="small"
                value={textValue}
                onChange={handleTextChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder="Enter text"
                fullWidth
            />
            {preview && preview !== submittedValue && (
                <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        {preview}
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default ManualTextInput;
