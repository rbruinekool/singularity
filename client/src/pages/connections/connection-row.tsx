import React from 'react';
import { TableRow, TableCell } from '@mui/material';
import { useCell } from 'tinybase/ui-react';
import SingularConnectionRow from './singular/singular-connection-row';

interface ConnectionRowProps {
    tableId: string;
    rowId: string;
}

// Main ConnectionRow component that returns different rows based on the connection type
const ConnectionRow: React.FC<ConnectionRowProps> = ({ tableId, rowId }) => {
    const connectionType = useCell(tableId, rowId, 'type') as string;

    // Route to appropriate row component based on type
    switch (connectionType) {
        case 'singular-control-app':
            return <SingularConnectionRow tableId={tableId} rowId={rowId} />;
        
        default:
            // Placeholder for other connection types
            return (
                <TableRow>
                    <TableCell colSpan={4}>
                        {/* Placeholder for connection type: {connectionType} */}
                        Connection type "{connectionType}" not implemented yet
                    </TableCell>
                </TableRow>
            );
    }
};

export default ConnectionRow;