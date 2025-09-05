import React from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { useSetPayloadValue } from '../hooks/usePayload';
import { Selection } from '../../../../../shared/singular/interfaces/singular-model';

interface DefaultSelectionProps {
    rundownId: string;
    rowId: string;
    modelId: string;
    currentValue: string;
    selections: Selection[];
}

const DefaultSelection: React.FC<DefaultSelectionProps> = ({
    rundownId,
    rowId,
    modelId,
    currentValue,
    selections
}) => {
    const setPayloadValue = useSetPayloadValue(rundownId, rowId, modelId);

    return (
        <Autocomplete
            size="small"
            options={selections || []}
            getOptionLabel={(option) => option.title}
            value={selections.find(s => s.id === currentValue) || null}
            onChange={(_, newValue) => {
                setPayloadValue(newValue?.id || '');
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    placeholder="Select a value"
                />
            )}
            fullWidth
        />
    );
};

export default DefaultSelection;
