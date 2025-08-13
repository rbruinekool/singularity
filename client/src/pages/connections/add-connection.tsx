import React, { useState } from 'react';
import { Paper, Typography, Button, Box, Dialog, DialogTitle, DialogContent, DialogActions, Divider } from '@mui/material';
import AddDialogSingular from './singular/add-dialog-singular';

const BUTTONS = [
    {
        label: 'Add',
        dialogTitle: 'Singular Control App',
        dialogContent: AddDialogSingular,
    },
    {
        label: 'Add',
        dialogTitle: 'Google Spreadsheet (WIP)',
        dialogContent: () => <Typography variant="body2">This feature is currently a work in progress.</Typography>
    },
     {
        label: 'Add',
        dialogTitle: 'Generic HTTP (WIP)',
        dialogContent: () => <Typography variant="body2">This feature is currently a work in progress.</Typography>
    },
     {
        label: 'Add',
        dialogTitle: 'Bitfocus Companion (WIP)',
        dialogContent: () => <Typography variant="body2">This feature is currently a work in progress.</Typography>
    }
    // Add more buttons here as needed
];

const AddConnection: React.FC = () => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogContent, setDialogContent] = useState<{ title: string; content: React.FC<{ onClose: () => void }> } | null>(null);

    const handleButtonClick = (button: typeof BUTTONS[number]) => {
        setDialogContent({ title: button.dialogTitle, content: button.dialogContent });
        setDialogOpen(true);
    };

    const handleDialogClose = () => {
        setDialogOpen(false);
        //setDialogContent(null);
    };

    return (
        <Paper sx={{ width: '100%', py: 1, px: 2 }}>
            <Typography variant="h6">
                Add Connection
            </Typography>
            <Typography variant="body1" gutterBottom>
                Add connections here to control external services and devices.
            </Typography>
            <Box display="flex" flexDirection="column" mt={2}>
                {BUTTONS.map((button, idx) => (
                    <Box key={idx} display="flex" alignItems="center" mb={2}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => handleButtonClick(button)}
                            sx={{ mr: 2 }}
                        >
                            {button.label}
                        </Button>
                        <Typography variant="body2">
                            {button.dialogTitle}
                        </Typography>
                    </Box>
                ))}
            </Box>
            <Dialog open={dialogOpen} onClose={handleDialogClose}>
                <DialogTitle sx={{ pb: 1, pt: 1, fontSize: '1rem' }}>{dialogContent?.title}</DialogTitle>
                <Divider sx={{ mb: 1 }} />
                <DialogContent sx={{ p: 2, pb: 1 }}>
                    {dialogContent?.content && (
                        <dialogContent.content onClose={handleDialogClose} />
                    )}
                </DialogContent>
            </Dialog>
        </Paper>
    );
};

export default AddConnection;