import React, { useState } from 'react';
import { Box, Typography, TextField } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { CellView, useCell, useRow, useSetCellCallback, useStore } from 'tinybase/ui-react';
import { Model } from '../../../../../shared/singular/interfaces/singular-model';

interface TextControlProps {
    model: Model;
    value?: string;
    rundownId: string;
    rowId: string;
}

const TextControl: React.FC<TextControlProps> = ({ model, rundownId, rowId }) => {
    const theme = useTheme();
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');

    const cell = useCell(rundownId, rowId, model.id);
    let storeValue = '';
    if (typeof cell === 'string') {
        storeValue = cell;
    } else if (typeof model.defaultValue === 'string') {
        storeValue = model.defaultValue;
    }

    // Get the current value from the store
    const handleClick = () => {
        setEditValue(storeValue);
        setIsEditing(true);
    };

    const handleNameSubmit = useSetCellCallback(
        rundownId,
        rowId,
        model.title,
        () => editValue,
        [editValue]
    );

    const handleCancel = () => {
        setIsEditing(false);
        setEditValue('');
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleNameSubmit();
            setIsEditing(false);
        } else if (event.key === 'Escape') {
            handleCancel();
        }
    };

    return (
        <Box>
            {!model.hideTitle && (
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                    {model.title}
                </Typography>
            )}
            {isEditing ? (
                <TextField
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleNameSubmit}
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
                    {storeValue || model.defaultValue}
                </Box>
            )}
            {model.source && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                    Source: {model.source}
                </Typography>
            )}
        </Box>
    );
};

export default TextControl;
