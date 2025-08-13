import React, { useState } from 'react';
import { DialogActions, Button, Typography, Box, IconButton, Snackbar } from '@mui/material';
import { ContentCopy } from '@mui/icons-material';
import { useCell } from 'tinybase/ui-react';
import { SingularModel } from '../../../shared/singular/interfaces/singular-model';

interface SingularInfoDialogProps {
  rowId: string;
  onClose: () => void;
}

const SingularInfoDialog: React.FC<SingularInfoDialogProps> = ({ rowId, onClose }) => {
  const tableId = 'connections';
  
  // State for copy feedback
  const [copySnackbarOpen, setCopySnackbarOpen] = useState(false);
  const [copiedUrlType, setCopiedUrlType] = useState<string>('');
  
  // Get connection data from TinyBase
  const label = useCell(tableId, rowId, 'label') as string;
  const appToken = useCell(tableId, rowId, 'appToken') as string;
  const updatedAt = useCell(tableId, rowId, 'updatedAt') as number;
  const modelText = useCell(tableId, rowId, 'model') as string;
  const model: SingularModel | null = modelText ? JSON.parse(modelText) : null;

  const singularName = model ? model.name : '';
  const outputUrl = appToken ? `https://app.singular.live/output/${appToken}/Output?aspect=16:9` : '';
  const appUrl = appToken ? `https://app.singular.live/control/${appToken}` : '';
  const apiUrl = appToken ? `https://app.singular.live/apiv2/controlapps/${appToken}/control` : '';
  const modelUrl = appToken ? `https://app.singular.live/apiv2/controlapps/${appToken}/model` : '';

  // Handle copy to clipboard
  const handleCopyUrl = async (url: string, urlType: string) => {
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        setCopiedUrlType(urlType);
        setCopySnackbarOpen(true);
      } catch (err) {
        console.error(`Failed to copy ${urlType} URL:`, err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          setCopiedUrlType(urlType);
          setCopySnackbarOpen(true);
        } catch (fallbackErr) {
          console.error(`Fallback copy failed for ${urlType}:`, fallbackErr);
        }
        document.body.removeChild(textArea);
      }
    }
  };

  // Format the timestamp
  const formatTimestamp = (timestamp: number | null | undefined): string => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <Box display="flex" flexDirection="column" gap={2}>
        <Box display="flex" alignItems="center">
          <Typography sx={{ minWidth: 160, textAlign: 'left' }} variant="body2">
            Label:
          </Typography>
          <Typography variant="body2" sx={{ ml: 2, flex: 1 }}>
            {label || 'No label'}
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center">
          <Typography sx={{ minWidth: 160, textAlign: 'left' }} variant="body2">
            Singular Name:
          </Typography>
          <Typography variant="body2" sx={{ ml: 2, flex: 1 }}>
            {singularName || 'Unknown'}
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center">
          <Typography sx={{ minWidth: 160, textAlign: 'left' }} variant="body2">
            App Token:
          </Typography>
          <Typography variant="body2" sx={{ ml: 2, flex: 1, fontFamily: 'monospace' }}>
            {appToken || 'No token'}
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="center">
          <Typography sx={{ minWidth: 160, textAlign: 'left' }} variant="body2">
            Last Updated:
          </Typography>
          <Typography variant="body2" sx={{ ml: 2, flex: 1 }}>
            {formatTimestamp(updatedAt)}
          </Typography>
        </Box>
        
        <Box display="flex" alignItems="flex-start">
          <Typography sx={{ minWidth: 160, textAlign: 'left' }} variant="body2">
            Output URL:
          </Typography>
          <Box sx={{ ml: 2, flex: 1, display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-all' }}>
              {outputUrl || 'No app token'}
            </Typography>
            {outputUrl && (
              <IconButton
                size="small"
                onClick={() => handleCopyUrl(outputUrl, 'Output')}
                sx={{ ml: 1 }}
                aria-label="copy output URL"
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>
        
        <Box display="flex" alignItems="flex-start">
          <Typography sx={{ minWidth: 160, textAlign: 'left' }} variant="body2">
            App URL:
          </Typography>
          <Box sx={{ ml: 2, flex: 1, display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-all' }}>
              {appUrl || 'No app token'}
            </Typography>
            {appUrl && (
              <IconButton
                size="small"
                onClick={() => handleCopyUrl(appUrl, 'App')}
                sx={{ ml: 1 }}
                aria-label="copy app URL"
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>
        
        <Box display="flex" alignItems="flex-start">
          <Typography sx={{ minWidth: 160, textAlign: 'left' }} variant="body2">
            API URL:
          </Typography>
          <Box sx={{ ml: 2, flex: 1, display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-all' }}>
              {apiUrl || 'No app token'}
            </Typography>
            {apiUrl && (
              <IconButton
                size="small"
                onClick={() => handleCopyUrl(apiUrl, 'API')}
                sx={{ ml: 1 }}
                aria-label="copy API URL"
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>
        
        <Box display="flex" alignItems="flex-start">
          <Typography sx={{ minWidth: 160, textAlign: 'left' }} variant="body2">
            Model URL:
          </Typography>
          <Box sx={{ ml: 2, flex: 1, display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ flex: 1, wordBreak: 'break-all' }}>
              {modelUrl || 'No app token'}
            </Typography>
            {modelUrl && (
              <IconButton
                size="small"
                onClick={() => handleCopyUrl(modelUrl, 'Model')}
                sx={{ ml: 1 }}
                aria-label="copy model URL"
              >
                <ContentCopy fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>
      </Box>
      
      <DialogActions>
        <Button onClick={onClose} color="primary" variant="contained">
          Close
        </Button>
      </DialogActions>

      {/* Snackbar for copy feedback */}
      <Snackbar
        open={copySnackbarOpen}
        autoHideDuration={2000}
        onClose={() => setCopySnackbarOpen(false)}
        message={`${copiedUrlType} URL copied to clipboard!`}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
};

export default SingularInfoDialog;
