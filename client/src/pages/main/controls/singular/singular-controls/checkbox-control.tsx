import React from 'react';
import { Box, Typography, FormControlLabel, Checkbox, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Model } from '../../../../../shared/singular/interfaces/singular-model';
import { usePayloadValue, useSetPayloadValue } from '../hooks/usePayload';

interface CheckboxControlProps {
    model: Model;
    rowId: string;
}

const CheckboxControl: React.FC<CheckboxControlProps> = ({ model,  rowId }) => {
    const theme = useTheme();
    const rundownId = 'rundown-1';

    // Use the new payload hooks
    const defaultValue = model.defaultValue === 'true' || model.defaultValue === 'True' || (typeof model.defaultValue === 'boolean' && model.defaultValue === true);
    const currentValue = usePayloadValue(rundownId, rowId, model.id, defaultValue);
    const setPayloadValue = useSetPayloadValue(rundownId, rowId, model.id);

    // Handle checkbox change
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPayloadValue(event.target.checked);
    };

    // Determine the current checked state
    const isChecked = currentValue === true;

    return (
        <Grid size={{ md: 12, lg: 6 }}>
            <Box sx={{ width: '100%' }}>
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={isChecked}
                            onChange={handleChange}
                            size="small"
                            sx={{
                                color: theme.palette.text.secondary,
                                '&.Mui-checked': {
                                    color: theme.palette.primary.main,
                                },
                            }}
                        />
                    }
                    label={
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {model.title}
                        </Typography>
                    }
                    sx={{
                        margin: 0,
                        '& .MuiFormControlLabel-label': {
                            fontSize: theme.typography.body2.fontSize,
                        }
                    }}
                />
                {model.source && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', ml: 4 }}>
                        Source: {model.source}
                    </Typography>
                )}
            </Box>
        </Grid>
    );
};

export default CheckboxControl;
