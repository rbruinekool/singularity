import React, { useState, useEffect } from 'react';
import { DialogActions, Button, TextField, Typography, Box } from '@mui/material';
import { useAddRowCallback, useTable } from 'tinybase/ui-react';
import { fetchModel } from '../../../shared/singular/fetchModel';
import { fetchAppMetaData } from '../../../shared/singular/fetchAppMetaData';
import { SingularAppMetaData } from '../../../shared/singular/interfaces/singular-app-metadata';

const AddDialogSingular: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [label, setLabel] = useState('');
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState(false);
  const [labelError, setLabelError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<boolean>(false);
  const [loadStatus, setLoadStatus] = useState<string>('');

  const connectionsTable = useTable('connections');
  const rowIds = Object.keys(connectionsTable);

  const hasLabel = label.trim() !== '';
  const hasToken = token.trim() !== '';
  const isLabelDuplicate = hasLabel && rowIds.some(id => connectionsTable[id]?.label === label.trim());
  const isTokenDuplicate = hasToken && rowIds.some(id => connectionsTable[id]?.appToken === token.trim());
  const isValid = hasToken && !isLabelDuplicate && !isTokenDuplicate;

  // Real-time validation
  useEffect(() => {
    if (hasLabel && isLabelDuplicate) {
      setLabelError(true);
    } else if (!hasLabel) {
      setLabelError(false);
    }
  }, [hasLabel, isLabelDuplicate]);

  useEffect(() => {
    if (hasToken && isTokenDuplicate) {
      setTokenError(true);
    } else if (!hasToken) {
      setTokenError(false);
    }
  }, [hasToken, isTokenDuplicate]);

  const addRow = useAddRowCallback(
    'connections',
    ({ token, label, model, metadata }: { token: string, label: string, model: string, metadata: SingularAppMetaData }) => {
      return {
        appToken: token,
        type: 'singular-control-app',
        label: label || metadata.name || 'Unnamed Singular App',
        updatedAt: Date.now(),
        model,
        outputUrl: metadata.outputUrl,
        publicControlUrl: metadata.publicControlUrl,
        publicControlApiUrl: metadata.publicControlApiUrl,
        publicModelApiUrl: metadata.publicModelApiUrl,
      };
    }
  );

  const handleSubmit = async () => {
    // Reset errors
    setLabelError(false);
    setTokenError(false);

    // Validate
    if (!hasToken) {
      setTokenError(true);
    }
    if (isLabelDuplicate) {
      setLabelError(true);
    }
    if (isTokenDuplicate) {
      setTokenError(true);
    }
    if (!isValid) {
      return;
    }

    setIsLoading(true);
    setLoadStatus('loading Composition');
    const [modelPromise, metadataPromise] = [fetchModel(token), fetchAppMetaData(token)];
    const [model, metadata] = await Promise.all([modelPromise, metadataPromise]).catch((e) => {
      setIsLoading(false);
      setLoadingError(true);
      setLoadStatus('Error Loading Composition');
      console.error('Failed to fetch model:', e);
      return [null, null];
    });

    if (!model || !metadata) {
      return;
    }

    // Check final label for duplicates
    const finalLabel = label || metadata.name || 'Unnamed Singular App';
    if (rowIds.some(id => connectionsTable[id]?.label === finalLabel)) {
      setIsLoading(false);
      setLoadingError(true);
      setLoadStatus('Duplicate label');
      return;
    }

    setIsLoading(false);
    setLoadingError(false);

    addRow({
      token,
      label: finalLabel,
      model: JSON.stringify(model),
      metadata
    });
    onClose();
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
          placeholder="e.g. My Cool App"
          sx={{ flex: 2, minWidth: 320, ml: 2 }}
          error={labelError}
          helperText={labelError ? "Duplicate label" : ""}
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
          helperText={tokenError ? (!hasToken ? "Token is required" : "Duplicate Token") : ""}
        />
      </Box>
      <Box>
        {isLoading || loadingError ? (
          <Typography variant="body2" color="textSecondary">
            {loadStatus}
          </Typography>
        ) : (
          <Box sx={{ minHeight: 24 }} />
        )}
      </Box>
      <DialogActions>
        <Button variant="outlined" onClick={onClose} color="primary">Cancel</Button>
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
          <Button onClick={handleSubmit} color="primary" variant="contained" disabled={!isValid}>Add</Button>
        )}
      </DialogActions>
    </>
  );
};

export default AddDialogSingular;
