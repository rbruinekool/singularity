import React from 'react';
import {
    Box,
    TextField,
    Typography,
    IconButton,
    useTheme
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface EditableCellProps {
    rowId: string;
    field: string;
    value: string;
    showCopyIcon?: boolean;
    isEditing?: boolean;
    editValue?: string;
    onEditValueChange?: (value: string) => void;
    onSave?: () => void;
    onCancel?: () => void;
    onStartEdit?: (rowId: string, field: string) => void;
    onCopyValue?: (value: string) => void;
}

const EditableCell: React.FC<EditableCellProps> = ({
    rowId,
    field,
    value,
    showCopyIcon = false,
    isEditing = false,
    editValue = '',
    onEditValueChange,
    onSave,
    onCancel,
    onStartEdit,
    onCopyValue
}) => {
    const theme = useTheme();
    
    if (isEditing) {
        return (
            <Box 
                display="flex" 
                alignItems="center" 
                gap={0.5}
                sx={{ 
                    minHeight: '24px',
                    width: '100%'
                }}
            >
                <TextField
                    value={editValue}
                    onChange={(e) => onEditValueChange?.(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onSave?.();
                        if (e.key === 'Escape') onCancel?.();
                    }}
                    onBlur={onSave}
                    autoFocus
                    size="small"
                    variant="outlined"
                    sx={{ 
                        flex: 1,
                        '& .MuiInputBase-root': { 
                            fontSize: theme.typography.body1.fontSize,
                            minHeight: '24px'
                        },
                        '& .MuiInputBase-input': {
                            padding: '4px 8px'
                        }
                    }}
                />
                {/* Reserve space for copy icon to prevent layout shift */}
                {showCopyIcon && (
                    <Box sx={{ width: '24px', height: '24px', marginLeft: '4px' }} />
                )}
            </Box>
        );
    }
    
    const displayValue = field === 'name' && value ? 
        value : value; // Show full programmatic name for name field
    
    const showPlaceholder = !displayValue && (field === 'description' || field === 'value');
    const placeholderText = field === 'description' ? 'Click to add description...' : 'Click to add value...';
    const isNameField = field === 'name';
    
    return (
        <Box 
            display="flex" 
            alignItems="center" 
            gap={0.5}
            onClick={() => !isNameField && onStartEdit?.(rowId, field)}
            sx={{ 
                cursor: isNameField ? 'default' : 'pointer', 
                minHeight: '24px' 
            }}
        >
            <Typography 
                variant="body1"
                sx={{
                    fontStyle: showPlaceholder ? 'italic' : 'normal',
                    color: showPlaceholder ? theme.palette.text.disabled : theme.palette.text.primary,
                    opacity: showPlaceholder ? 0.7 : 1
                }}
            >
                {showPlaceholder ? placeholderText : (displayValue || '')}
            </Typography>
            {showCopyIcon && value && (
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        onCopyValue?.(value);
                    }}
                    sx={{ 
                        color: theme.palette.text.secondary,
                        '&:hover': { color: theme.palette.primary.main },
                        padding: '2px',
                        marginLeft: '4px'
                    }}
                >
                    <ContentCopyIcon fontSize="small" />
                </IconButton>
            )}
        </Box>
    );
};

export default EditableCell;
