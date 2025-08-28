import React from 'react';
import { useCell, useStore } from 'tinybase/ui-react';
import { Box, Typography } from '@mui/material';

interface ReadOnlyTinyBaseCellProps {
    tableId: string;
    rowId: string;
    colKey: string;
}

const ReadOnlyTinyBaseCell: React.FC<ReadOnlyTinyBaseCellProps> = ({ tableId, rowId, colKey }) => {
    const cellValue = useCell(tableId, rowId, colKey) || '';
    const store = useStore();

    // Only display when row is valid and property exists in the row
    if (!store?.hasTable(tableId) || !store?.hasRow(tableId, rowId)) {
        return null;
    }

    return (
        <Box 
            sx={{ 
                width: '100%', 
                height: '100%',
                minHeight: '18px',
                display: 'flex',
                alignItems: 'center',
            }}
        >
            <Typography 
                variant="body2" 
                sx={{ 
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: '0.75rem',
                    px: 0.5,
                    width: '100%',
                }}
            >
                {cellValue}
            </Typography>
        </Box>
    );
};

export default ReadOnlyTinyBaseCell;
