import React from 'react';
import { Box } from '@mui/material';
import VariablesTable from './variables-table';

const Variables: React.FC = () => {

    return (
        <Box sx={{ p: 3 }}>
            <VariablesTable />
        </Box>
    );
};

export default Variables;
