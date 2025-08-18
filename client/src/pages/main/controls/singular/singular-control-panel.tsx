import React, { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Paper, Divider, TextField, Grid, IconButton, Collapse } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useCell, useRow, useSetCellCallback, useStore, useTable } from 'tinybase/ui-react';
import { getPayloadModel } from '../../../../shared/singular/getPayloadModel';
import { SingularModel, Model } from '../../../../shared/singular/interfaces/singular-model';
import TextControl from './singular-controls/text-control';
import TextareaControl from './singular-controls/textarea-control';
import TimeControl from './singular-controls/time-control';
import SelectionControl from './singular-controls/selection-control';
import CheckboxControl from './singular-controls/checkbox-control';

interface SingularControlPanelProps {
    rowId: string;
}

/**
 * SingularControlPanel component displays and manages controls for a Singular subcomposition row.
 *
 * This panel allows users to view and edit the name of a subcomposition row, and renders dynamic controls
 * based on the payload model associated with the row. Controls are generated according to the model type,
 * and currently supports text, textarea, datetime, selection, and checkbox controls. Unsupported control types are indicated in the UI.
 *
 * The component interacts with a TinyBase store to retrieve row data, connection information, and model definitions.
 * It provides inline editing for the row name and displays a list of controls for the subcomposition.
 *
 * Props:
 * - `rowId`: The unique identifier for the row in the rundown table.
 *
 * @component
 * @param {SingularControlPanelProps} props - The props for the component.
 * @returns {JSX.Element} The rendered SingularControlPanel component.
 */
const SingularControlPanel: React.FC<SingularControlPanelProps> = ({ rowId }) => {
    const theme = useTheme();
    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState('');
    
    // Simple global collapsed state - shared across all components
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const stored = localStorage.getItem('singularControlPanel_collapsed');
        return stored ? JSON.parse(stored) : false; // Default to expanded
    });
    
    // Update localStorage when collapse state changes
    useEffect(() => {
        localStorage.setItem('singularControlPanel_collapsed', JSON.stringify(isCollapsed));
    }, [isCollapsed]);
    
    const handleToggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    const rowData = useRow('rundown-1', rowId) || {};

    // Get the connections table (static - no subscription)
    const connections = useTable('connections') || {};

    // Find the connection row that matches the appToken (static)
    const connectionRowId = useMemo(() => {
        if (!rowData.appToken) return null;

        for (const [rowId, row] of Object.entries(connections)) {
            const connectionRow = row as Record<string, any>;
            if (connectionRow.appToken === rowData.appToken) {
                return rowId;
            }
        }
        return null;
    }, [connections, rowData.appToken]);

    // Get the model cell from the matching connection (static)
    const modelCell = useCell('connections', connectionRowId || '', 'model') as string || '';

    // Parse the model if it exists (static)
    const singularModel: SingularModel | null = useMemo(() => {
        if (!modelCell) return null;
        try {
            return JSON.parse(modelCell);
        } catch (error) {
            console.error('Failed to parse model cell:', error);
            return null;
        }
    }, [modelCell]);

    // Get the payload model using the subcomposition ID (static)
    const payloadModel = useMemo(() => {
        if (!singularModel || !rowData.subCompositionId) return [];
        return getPayloadModel(singularModel, String(rowData.subCompositionId));
    }, [singularModel, rowData.subCompositionId]);

    // Get the current name value from the store (static)
    const currentName = useCell('rundown-1', rowId, 'name') as string || '';

    const handleNameClick = () => {
        setEditNameValue(currentName);
        setIsEditingName(true);
    };

    const handleNameSubmit = useSetCellCallback(
        'rundown-1',
        rowId,
        'name',
        () => editNameValue,
        [editNameValue],
        undefined,
        () => {
            setIsEditingName(false);
        }
    );

    const handleNameCancel = () => {
        setIsEditingName(false);
        setEditNameValue('');
    };

    const handleNameKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            handleNameSubmit();
        } else if (event.key === 'Escape') {
            handleNameCancel();
        }
    };

    // Render control component based on singular field (e.g. text or checkbox)
    const renderControl = (model: Model) => {
        switch (model.type) {
            case 'text':
                return (
                    <TextControl
                        key={model.id}
                        model={model}
                        rowId={rowId} />
                );
            case 'textarea':
                return (
                    <TextareaControl
                        key={model.id}
                        model={model}
                        rowId={rowId} />
                );
            case 'datetime':
                return (
                    <TimeControl
                        key={model.id}
                        model={model}
                        rowId={rowId} />
                );
            case 'selection':
                return (
                    <SelectionControl
                        key={model.id}
                        model={model}
                        rowId={rowId} />
                );
            case 'checkbox':
                return (
                    <CheckboxControl
                        key={model.id}
                        model={model}
                        rowId={rowId} />
                );
            case 'button':
                return null; // Ignore button types completely
            default:
                return (
                    //TODO: make resizable grid or flexbox, perhaps give user control
                    <Grid key={model.id} size={12}>
                        <Box sx={{ p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                Unsupported control type: "{model.type}" (ID: {model.id})
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Title: {model.title}
                            </Typography>
                        </Box>
                    </Grid>
                );
        }
    };

    return (
        <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
                <Box sx={{ minHeight: '40px', display: 'flex', alignItems: 'center' }}>
                    {isEditingName ? (
                        <TextField
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            onBlur={handleNameSubmit}
                            onKeyDown={handleNameKeyDown}
                            size="small"
                            variant="standard"
                            autoFocus
                            sx={{
                                '& .MuiInput-input': {
                                    padding: '2px 0',
                                    fontSize: theme.typography.h6.fontSize,
                                    fontFamily: theme.typography.h6.fontFamily,
                                    fontWeight: theme.typography.h6.fontWeight,
                                }
                            }}
                        />
                    ) : (
                        <Box
                            onClick={handleNameClick}
                            sx={{
                                cursor: 'pointer',
                                padding: '2px 0',
                                color: currentName ? 'inherit' : theme.palette.text.secondary,
                                fontStyle: currentName ? 'normal' : 'italic',
                                '&:hover': {
                                    backgroundColor: theme.palette.action.hover,
                                    borderRadius: '4px',
                                    px: 1,
                                }
                            }}
                        >
                            {currentName || 'Click to edit name'}
                        </Box>
                    )}
                </Box>
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Paper sx={{
                p: 2,
                backgroundColor: theme.palette.background.default,
                border: `1px solid ${theme.palette.divider}`
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: isCollapsed ? 0 : 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        Singular Controls
                    </Typography>
                    <IconButton
                        onClick={handleToggleCollapse}
                        size="small"
                        sx={{ 
                            transition: 'transform 0.2s',
                            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'
                        }}
                    >
                        <ExpandMoreIcon fontSize="small" />
                    </IconButton>
                </Box>

                <Collapse in={!isCollapsed} timeout="auto" unmountOnExit>
                    {payloadModel.length > 0 ? (
                        <Grid container spacing={2}>
                            {payloadModel
                                .filter(model => !model.hidden)
                                .sort((a, b) => a.index - b.index)
                                .map(model => renderControl(model))
                            }
                        </Grid>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            {singularModel
                                ? 'No editable fields available for this subcomposition.'
                                : 'Loading subcomposition data...'}
                        </Typography>
                    )}
                </Collapse>
            </Paper>
        </Box>
    );
};

export default SingularControlPanel;
