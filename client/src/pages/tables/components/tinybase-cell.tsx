import { Box, TextField, Typography } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useCell, useSetCellCallback } from "tinybase/ui-react";

// Cell component for TinyBase cell editing
const TinyBaseCell: React.FC<{ tableId: string; rowId: string; colKey: string }> = ({ tableId, rowId, colKey }) => {
    const value = useCell(tableId, rowId, colKey) as string || '';
    const [editing, setEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);
    
    // Update local state when TinyBase value changes
    useEffect(() => {
        setEditValue(value);
    }, [value]);
    
    // Use TinyBase's reactive hook for cell updates
    const setCell = useSetCellCallback(
        tableId,
        rowId,
        colKey,
        (newValue) => newValue as string,
        [editValue]
    );
    
    const handleSave = () => {
        setCell(editValue);
        setEditing(false);
    };
    
    const handleCancel = () => {
        setEditValue(value);
        setEditing(false);
    };
    
    // Focus the input when editing starts
    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editing]);
    
    return editing ? (
        <TextField
            inputRef={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
            }}
            size="small"
            autoFocus
            fullWidth
            variant="standard"
            sx={{ 
                margin: 0,
                padding: 0,
                '& .MuiInputBase-input': { 
                    padding: '0px 4px',
                    height: '28px',
                }
            }}
        />
    ) : (
        <Box 
            onClick={() => setEditing(true)} 
            sx={{ 
            cursor: 'pointer', 
            padding: '0px 4px',
            height: '28px', 
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            '&:hover': { 
                backgroundColor: 'action.hover' 
            }
            }}
        >
            <Typography variant="body1">
            {value || <span style={{ color: 'rgba(0,0,0,0.38)' }}>&nbsp;</span>}
            </Typography>
        </Box>
    );
};

export default TinyBaseCell;