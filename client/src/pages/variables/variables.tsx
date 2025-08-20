import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import VariablesTable from './variables-table';

const Variables: React.FC = () => {
    const theme = useTheme();

    return (
        <Box sx={{ p: 3 }}>
            <VariablesTable />
        </Box>
    );
};

export default Variables;
