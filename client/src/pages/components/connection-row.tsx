import React, { useState } from 'react';
import { TableRow, TableCell, IconButton } from '@mui/material';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Divider, Typography } from '@mui/material';
import { Autorenew } from '@mui/icons-material';
import { CellView, useDelRowCallback, useCell, useSetCellCallback, useStore } from 'tinybase/ui-react';
import { fetchModel } from '../../shared/fetchModel';

interface ConnectionRowProps {
    tableId: string;
    rowId: string;
}

const ConnectionRow: React.FC<ConnectionRowProps> = ({ tableId, rowId }) => {
    const store = useStore();
    const delRow = useDelRowCallback(
        tableId,
        (rowId: string) => rowId
    );

    const [dialogOpen, setDialogOpen] = useState(false);
    const [isRenewing, setIsRenewing] = useState(false);

    const updatedAt = useCell(tableId, rowId, 'updatedAt');

    // Format the timestamp
    const formatTimestamp = (timestamp: number | null | undefined): string => {
        if (!timestamp) return 'Never';
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleDeleteClick = () => {
        setDialogOpen(true);
    };

    const handleRenewClick = () => {
        if (!store) throw new Error('Store is not available');
        const connectionType = store.getCell(tableId, rowId, 'type');

        // Renew logic for Singular Control Apps
        if (connectionType === 'singular-control-app') {
            const token = store.getCell(tableId, rowId, 'appToken');
            if (token && typeof token === 'string') {
                setIsRenewing(true);
                fetchModel(token)
                    .then(model => {
                        store.setCell(tableId, rowId, 'model', JSON.stringify(model));
                        store.setCell(tableId, rowId, 'updatedAt', Date.now());
                    })
                    .catch(error => {
                        console.error('Failed to renew connection:', error);
                    })
                    .finally(() => {
                        setIsRenewing(false);
                    });
            }
        }
    };

    const handleConfirmDelete = () => {
        delRow(rowId);
        setDialogOpen(false);
    };

    const handleCancel = () => {
        setDialogOpen(false);
    };

    return (
        <>
            <TableRow>
                <TableCell>
                    <CellView tableId={tableId} rowId={rowId} cellId="label" />
                </TableCell>
                <TableCell>
                    <CellView tableId={tableId} rowId={rowId} cellId="type" />
                </TableCell>
                <TableCell>
                    {formatTimestamp(updatedAt as number)}
                </TableCell>
                <TableCell align="right">
                    <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <IconButton
                            aria-label="renew"
                            onClick={handleRenewClick}
                            size="small"
                            disabled={isRenewing}
                        >
                            <Autorenew
                                sx={{
                                    animation: isRenewing ? 'spin 1s linear infinite' : 'none',
                                    '@keyframes spin': {
                                        '0%': {
                                            transform: 'rotate(0deg)',
                                        },
                                        '100%': {
                                            transform: 'rotate(360deg)',
                                        },
                                    },
                                }}
                            />
                        </IconButton>
                        <IconButton aria-label="delete" onClick={handleDeleteClick} size="small">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                        </IconButton>
                    </span>
                </TableCell>
            </TableRow>
            <Dialog open={dialogOpen} onClose={handleCancel} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ pb: 0 }}>Delete Connection</DialogTitle>
                <Divider />
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        Are you sure you want to delete{' '}
                        <b>
                            <CellView tableId={tableId} rowId={rowId} cellId="label" />
                        </b>?
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        This will remove all actions and assets associated with this connection.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancel} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleConfirmDelete} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ConnectionRow;
