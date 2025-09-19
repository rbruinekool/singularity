import React from 'react';
import { Box, Typography, Button, DialogTitle, DialogContent, DialogActions } from '@mui/material';

interface FollowConfigDialogProps {
  onBack: () => void;
  onSave: () => void;
}

/**
 * Dialog content for configuring Follow input method
 * This component provides UI for selecting fields to follow
 */
const FollowConfigDialog: React.FC<FollowConfigDialogProps> = ({ onBack, onSave }) => {
  return (
    <>
      <DialogTitle>Configure Follow Field</DialogTitle>
      <DialogContent>
        <Box sx={{ p: 1 }}>
          <Typography variant="body1">
            Select another field to follow. This field's value will automatically update when the followed field changes.
          </Typography>
          
          {/* Placeholder content - to be replaced with actual field selection UI */}
          <Box sx={{ 
            my: 2, 
            p: 2, 
            border: '1px dashed', 
            borderColor: 'divider',
            borderRadius: 1,
            bgcolor: 'background.paper'
          }}>
            <Typography variant="body2" color="text.secondary">
              Field selection UI will be implemented here.
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onBack}>Back</Button>
        <Button onClick={onSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </>
  );
};

export default FollowConfigDialog;
