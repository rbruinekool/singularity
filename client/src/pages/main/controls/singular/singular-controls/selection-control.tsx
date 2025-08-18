import React, { useState, useMemo } from 'react';
import { Box, Typography, FormControl, Select, MenuItem, SelectChangeEvent, CircularProgress, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { Model, Selection } from '../../../../../shared/singular/interfaces/singular-model';
import { usePayloadValue, useSetPayloadValue } from '../hooks/usePayload';

interface SelectionControlProps {
    model: Model;
    rowId: string;
}

const SelectionControl: React.FC<SelectionControlProps> = ({ model, rowId }) => {
    const theme = useTheme();
    const rundownId = 'rundown-1';
    
    // Use the new payload hooks
    const currentValue = usePayloadValue(rundownId, rowId, model.id, model.defaultValue || '');
    const setPayloadValue = useSetPayloadValue(rundownId, rowId, model.id);

    // Determine if we need to fetch selections from URL
    const shouldFetchFromUrl = model.source === 'url' && !!model.sourceUrl;

    // Fetch selections from URL using TanStack Query
    const { data: urlSelections, isLoading, error } = useQuery({
        queryKey: ['selections', model.sourceUrl],
        queryFn: async (): Promise<Selection[]> => {
            if (!model.sourceUrl) throw new Error('No URL source provided');
            
            const response = await fetch(model.sourceUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch selections: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data as Selection[];
        },
        enabled: shouldFetchFromUrl && !!model.sourceUrl,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    });

    // Get the selections to use (either from model or from URL)
    const selections: Selection[] = useMemo(() => {
        if (shouldFetchFromUrl) {
            return urlSelections || [];
        }
        return model.selections || [];
    }, [shouldFetchFromUrl, urlSelections, model.selections]);

    // Handle selection change
    const handleChange = (event: SelectChangeEvent) => {
        const selectedId = event.target.value as string;
        
        // Find the selection and store its title
        const selectedOption = selections.find(selection => selection.id === selectedId);
        if (selectedOption) {
            setPayloadValue(selectedOption.title);
        }
    };

    // Get the actual value for the Select component (should be the selection ID that matches the current title)
    const getSelectValue = () => {
        
        // If we have a current value, try to match it
        if (currentValue) {
            // Try to find selection by title first (stored value)
            const matchingSelection = selections.find(selection => selection.title === currentValue);
            if (matchingSelection) {
                return matchingSelection.id;
            }
            
            // Try to find selection by ID (fallback)
            const matchingById = selections.find(selection => selection.id === currentValue);
            if (matchingById) {
                return matchingById.id;
            }
        }
        
        // If no current value, check if default value matches a selection ID
        if (model.defaultValue && selections.some(s => s.id === model.defaultValue)) {
            return model.defaultValue;
        }
        
        return '';
    };

    return (
        <Grid size={{ md: 12, lg: 6 }}>
            <Box sx={{ width: '100%' }}>
                {!model.hideTitle && (
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                        {model.title}
                    </Typography>
                )}
                
                <FormControl fullWidth size="small">
                    <Select
                        value={getSelectValue()}
                        onChange={handleChange}
                        displayEmpty
                        disabled={isLoading}
                        sx={{
                            '& .MuiOutlinedInput-input': {
                                fontSize: theme.typography.body2.fontSize,
                                padding: '8px 12px',
                            }
                        }}
                    >
                        {isLoading ? (
                            <MenuItem disabled>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <CircularProgress size={16} />
                                    <em>Loading options...</em>
                                </Box>
                            </MenuItem>
                        ) : error ? (
                            <MenuItem disabled>
                                <em>Error loading options</em>
                            </MenuItem>
                        ) : [
                            model.defaultValue && !selections.some(s => s.id === model.defaultValue) ? (
                                <MenuItem key="default" value="" disabled>
                                    <em>{model.defaultValue}</em>
                                </MenuItem>
                            ) : null,
                            ...selections.map((selection) => (
                                <MenuItem key={selection.id} value={selection.id}>
                                    {selection.title}
                                </MenuItem>
                            ))
                        ].filter(Boolean)}
                    </Select>
                </FormControl>
                
                {error && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                        Failed to load options: {error.message}
                    </Typography>
                )}
            </Box>
        </Grid>
    );
};

export default SelectionControl;
