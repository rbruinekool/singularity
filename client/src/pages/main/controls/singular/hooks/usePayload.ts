import { useCallback, useMemo } from 'react';
import { useCell, useSetCellCallback } from 'tinybase/ui-react';

/**
 * Custom hook to handle payload JSON structure in rundown rows
 * This provides type-safe access to individual payload fields stored as JSON
 */
export const usePayloadValue = (tableId: string, rowId: string, fieldId: string, defaultValue?: any) => {
    // Get the entire payload JSON string
    const payloadString = useCell(tableId, rowId, 'payload') as string || '{}';
    
    // Parse and extract the specific field value
    const fieldValue = useMemo(() => {
        try {
            const payload = JSON.parse(payloadString);
            return payload[fieldId] ?? defaultValue;
        } catch {
            return defaultValue;
        }
    }, [payloadString, fieldId, defaultValue]);
    
    return fieldValue;
};

/**
 * Custom hook to set payload field values
 * This updates individual fields within the payload JSON structure
 */
export const useSetPayloadValue = (tableId: string, rowId: string, fieldId: string) => {
    // Use TinyBase React hook for proper lifecycle compatibility
    const setPayloadCell = useSetCellCallback(
        tableId,
        rowId,
        'payload',
        (newValue: any, store) => {
            // Get current payload from store
            const currentPayloadString = store.getCell(tableId, rowId, 'payload') as string || '{}';
            try {
                const currentPayload = JSON.parse(currentPayloadString);
                // Update the specific field
                currentPayload[fieldId] = newValue;
                // Return the updated JSON string
                return JSON.stringify(currentPayload);
            } catch {
                // If parsing fails, create new payload with just this field
                return JSON.stringify({ [fieldId]: newValue });
            }
        },
        [fieldId, tableId, rowId]
    );
    
    return useCallback((newValue: any) => {
        setPayloadCell(newValue);
    }, [setPayloadCell]);
};
