import React from 'react';
import { Box, Grid, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { TableView } from 'tinybase/ui-react';
import AddConnection from './add-connection';
import ConnectionRow from './connection-row';

const Connections: React.FC = () => {
    return (
        <Grid container spacing={2} sx={{ m: 2 }}>
            <Grid size={{ xs: 12, md: 6 }}>
                <Box display={'flex'} flexDirection="column" height="100%">
                    <Typography variant="h6" gutterBottom>
                        Existing Connections
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                        Existing Connections are listed here, you can add new connections in the panel on the right
                    </Typography>
                    <Paper>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Label</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Last Renewed</TableCell>
                                    <TableCell /> {/* Empty cell for action buttons column */}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                <TableView
                                    tableId="connections"
                                    rowComponent={ConnectionRow}
                                />
                            </TableBody>
                        </Table>
                    </Paper>
                </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                <AddConnection />
            </Grid>
        </Grid>
    );
};

export default Connections;