import React, { useState, useMemo } from 'react';
import { Box, Typography, Paper, Divider, TextField, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useCell, useRow, useSetCellCallback, useStore, useTable } from 'tinybase/ui-react';
import { getPayloadModel } from '../../../../shared/singular/getPayloadModel';
import { SingularModel, Model } from '../../../../shared/singular/interfaces/singular-model';
import TextControl from './singular-controls/text-control';
import TimeControl from './singular-controls/time-control';
import SelectionControl from './singular-controls/selection-control';

interface SingularControlPanelProps {
    rowId: string;
    rundownId: string;
}

/**
 * SingularControlPanel component displays and manages controls for a Singular subcomposition row.
 *
 * This panel allows users to view and edit the name of a subcomposition row, and renders dynamic controls
 * based on the payload model associated with the row. Controls are generated according to the model type,
 * and currently supports text controls. Unsupported control types are indicated in the UI.
 *
 * The component interacts with a TinyBase store to retrieve row data, connection information, and model definitions.
 * It provides inline editing for the row name and displays a list of controls for the subcomposition.
 *
 * Props:
 * - `rowId`: The unique identifier for the row in the rundown table.
 * - `rundownId`: The unique identifier for the rundown table.
 *
 * @component
 * @param {SingularControlPanelProps} props - The props for the component.
 * @returns {JSX.Element} The rendered SingularControlPanel component.
 */
const SingularControlPanel: React.FC<SingularControlPanelProps> = ({ rundownId, rowId }) => {
    const theme = useTheme();
    const store = useStore();
    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState('');

    const rowData = useRow(rundownId, rowId) || {};

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
        if (!singularModel || !rowData.subcompId) return [];
        return getPayloadModel(singularModel, String(rowData.subcompId));
    }, [singularModel, rowData.subcompId]);

    // Get the current name value from the store (static)
    const currentName = useCell(rundownId, rowId, 'name') as string || '';

    const handleNameClick = () => {
        setEditNameValue(currentName);
        setIsEditingName(true);
    };

    const handleNameSubmit = useSetCellCallback(
        rundownId,
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
        const controlContent = (() => {
            switch (model.type) {
                case 'text':
                    return (
                        <Grid key={model.id} size={{ md: 12, lg: 6 }}>
                            <TextControl
                                model={model}
                                rundownId={rundownId}
                                rowId={rowId} />
                        </Grid>
                    );
                case 'datetime':
                    return (
                        <Grid key={model.id} size={{ md: 12, lg: 6 }}>
                            <TimeControl
                                model={model}
                                rundownId={rundownId}
                                rowId={rowId} />
                        </Grid>
                    );
                case 'selection':
                    return (
                        <Grid key={model.id} size={{ md: 12, lg: 6 }}>
                            <SelectionControl
                                model={model}
                                rundownId={rundownId}
                                rowId={rowId} />
                        </Grid>
                    );
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
        })();

        return controlContent;
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
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
                    Singular Controls
                </Typography>

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
            </Paper>
        </Box>
    );
};

export default SingularControlPanel;
