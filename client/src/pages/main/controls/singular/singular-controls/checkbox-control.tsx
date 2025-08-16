import React from 'react';
import { Box, Typography, FormControlLabel, Checkbox, Grid } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useCell, useSetCellCallback } from 'tinybase/ui-react';
import { Model } from '../../../../../shared/singular/interfaces/singular-model';

interface CheckboxControlProps {
    model: Model;
    rundownId: string;
    rowId: string;
}

const CheckboxControl: React.FC<CheckboxControlProps> = ({ model, rundownId, rowId }) => {
    const theme = useTheme();

    // Get the current value from TinyBase
    const currentValue = useCell(rundownId, rowId, model.id) as boolean | null;

    // Set cell callback for updating the checkbox value
    const setCellValue = useSetCellCallback(
        rundownId,
        rowId,
        model.id,
        (value: boolean) => value,
        []
    );

    // Handle checkbox change
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCellValue(event.target.checked);
    };

    // Determine the current checked state
    const isChecked = currentValue === true || (currentValue === null && model.defaultValue === 'true');

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
