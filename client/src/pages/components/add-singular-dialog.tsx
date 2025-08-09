import React, { useState } from 'react';
import { DialogActions, Button, TextField, Typography, Box } from '@mui/material';
import { useAddRowCallback } from 'tinybase/ui-react';
import { useQuery } from '@tanstack/react-query';
import { fetchModel } from '../../shared/fetchModel';

const AddSingularDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [label, setLabel] = useState('');
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadStatus, setLoadStatus] = useState<string>('');

  const addRow = useAddRowCallback(
    'connections',
    ({ token, label, model }: { token: string, label: string, model: string }) => {
      return {
        appToken: token,
        type: 'singular-control-app',
        label: label || '',
        updatedAt: Date.now(),
        model
      };
    }
  );

  //TODO: Implement form validation (particularly for duplicate labels and tokens)
  const handleSubmit = async () => {
    if (!token) {
      setTokenError(true);
      return;
    }

    setIsLoading(true);
    setLoadStatus('loading Composition Model');
    fetchModel(token)
      .then(model => {
        setIsLoading(false);

        const labelToUse = label === '' ? model?.name || '' : label
        addRow({
          token,
          label: labelToUse,
          model: JSON.stringify(model)
        });
        onClose();
      })
      .catch(error => {
        setIsLoading(false);
        setLoadStatus('Error Loading Composition');
        console.error('Failed to fetch model:', error);
        return null;
      });


  };

  return (
    <>
      <Box display="flex" alignItems="center" mb={0}>
        <Typography sx={{ minWidth: 160, textAlign: 'left' }} variant="body2">
          Label:
        </Typography>
        <TextField
          value={label}
          onChange={e => setLabel(e.target.value)}
          margin="normal"
          placeholder="e.g. My Cool App (Leave empty to use the Singular app name)"
          sx={{ flex: 2, minWidth: 320, ml: 2 }}
        />
      </Box>
      <Box display="flex" alignItems="center" mb={0}>
        <Typography sx={{ minWidth: 160, textAlign: 'left' }} variant="body2">
          Control App Token:
        </Typography>
        <TextField
          value={token}
          onChange={e => setToken(e.target.value)}
          margin="normal"
          placeholder="Just the token, not the full URL"
          sx={{ flex: 2, minWidth: 320, ml: 2 }}
          error={tokenError}
          helperText={tokenError ? "Token is required" : ""}
        />
      </Box>
      <Box>
        {isLoading ? (
          <Typography variant="body2" color="textSecondary">
            {loadStatus}
          </Typography>
        ) : (
          <Typography variant="body2" color="textSecondary">
            {loadStatus || "Enter the token to load the model."}
          </Typography>
        )}
      </Box>
      <DialogActions>
        <Button onClick={onClose} color="primary">Cancel</Button>
        {isLoading ? (
          <Button color="primary" variant="contained" disabled>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: 8 }}>Loading</span>
              <span>
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="#1976d2"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray="60"
                    strokeDashoffset="40"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0 12 12"
                      to="360 12 12"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </svg>
              </span>
            </span>
          </Button>
        ) : (
          <Button onClick={handleSubmit} color="primary" variant="contained">Add</Button>
        )}
      </DialogActions>
    </>
  );
};

export default AddSingularDialog;
