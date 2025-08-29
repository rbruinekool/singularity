import React, { useState } from 'react';
import { Box, Typography, TextField, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Model } from '../../../../../shared/singular/interfaces/singular-model';
import { usePayloadValue, useSetPayloadValue } from '../hooks/usePayload';
import { replaceCustomVariables } from './variables';
import { useTable } from 'tinybase/ui-react';

interface TextControlProps {
    model: Model;
    value?: string;
    rowId: string;
}

const TextControl: React.FC<TextControlProps> = ({ model, rowId }) => {
    const theme = useTheme();
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [vPreview, setVPreview] = useState('');
    const rundownId = 'rundown-1';

    //payload hooks
    const storeValue = usePayloadValue(rundownId, rowId, model.id, model.defaultValue || '');
    const setPayloadValue = useSetPayloadValue(rundownId, rowId, model.id);

    const variables = useTable('variables');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputString = e.target.value;
        setEditValue(inputString);
        if (inputString.match(/\$\(([^)]+)\)/g)) {
            setVPreview(replaceCustomVariables(variables, inputString));
        } else {
            setVPreview('');
        }
    };

    // Get the current value from the store
    const handleClick = () => {
        setEditValue(String(storeValue));
        setIsEditing(true);
    };

    const handleSubmit = () => {
        setPayloadValue(editValue);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditValue('');
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleSubmit();
        } else if (event.key === 'Escape') {
            handleCancel();
        }
    };

    return (
        <Grid size={{ md: 12, lg: 6 }}>
            <Box>
                {!model.hideTitle && (
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                        {model.title}
                    </Typography>
                )}
                {isEditing ? (
                    <TextField
                        value={editValue}
                        onChange={handleChange}
                        onBlur={handleSubmit}
                        onKeyDown={handleKeyDown}
                        placeholder={model.defaultValue}
                        size="small"
                        fullWidth
                        variant="outlined"
                        autoFocus
                        sx={{
                            '& .MuiOutlinedInput-input': {
                                fontSize: theme.typography.body2.fontSize,
                                padding: '8px 12px',
                            }
                        }}
                    />
                ) : (
                    <Box
                        onClick={handleClick}
                        sx={{
                            cursor: 'pointer',
                            padding: '8px 12px',
                            border: '1px solid',
                            borderColor: theme.palette.divider,
                            borderRadius: '4px', // Match TextField border radius
                            height: '17px', // Use minHeight instead of fixed height
                            display: 'flex',
                            alignItems: 'center',
                            color: storeValue ? 'inherit' : theme.palette.text.secondary,
                            fontStyle: storeValue ? 'normal' : 'italic',
                            fontSize: theme.typography.body2.fontSize,
                            fontFamily: theme.typography.body2.fontFamily,
                            lineHeight: theme.typography.body2.lineHeight,
                            '&:hover': {
                                borderColor: theme.palette.primary.main,
                                backgroundColor: theme.palette.action.hover,
                            }
                        }}
                    >
                        {String(storeValue) || model.defaultValue}
                    </Box>
                )}
                {
                    vPreview !== '' && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                            {vPreview ? `${vPreview}` : ''}
                        </Typography>
                    )
                }
                {/* {model.source && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        Source: {model.source}
                    </Typography>
                )} */}
            </Box>
        </Grid>
    );
};

export default TextControl;
