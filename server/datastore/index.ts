import type { MergeableStore } from "tinybase";
import type { RundownRow } from "./interfaces";
import { createLogger } from "../utils/logger.ts";

const logger = createLogger('datastore');

/**
 * Processes a PATCH request to update rundown items
 * @param store - The TinyBase MergeableStore instance
 * @param patchData - The JSON array of objects to patch
 * @returns Object with success status and details
 */
export function processPatchRequest(store: MergeableStore, patchData: unknown): { success: boolean; message: string; errors?: string[] } {
    // Verify that the JSON is actually an array of objects
    if (!Array.isArray(patchData)) {
        const error = 'Patch data must be an array of objects';
        logger.error({ patchData: typeof patchData }, error);
        return { success: false, message: error };
    }

    // Get the full rundown-1 table from the store
    const rundownTable = store.getTable('rundown-1') as unknown as Record<string, RundownRow>;
    if (!rundownTable) {
        const error = 'Rundown table not found in store';
        logger.error({}, error);
        return { success: false, message: error };
    }

    const errors: string[] = [];
    const validUpdates: Array<{ id: number; data: Partial<RundownRow> }> = [];

    // Loop over each object in the incoming array and validate
    for (let i = 0; i < patchData.length; i++) {
        const item = patchData[i];
        
        // Check if item is an object
        if (!item || typeof item !== 'object') {
            errors.push(`Item at index ${i} is not an object`);
            continue;
        }

        // Check if object has 'id' property that is a number
        if (!('id' in item) || typeof item.id !== 'number') {
            errors.push(`Item at index ${i} does not have a valid 'id' property (must be a number)`);
            continue;
        }

        const id = item.id;

        // Check if an object with the same 'id' property currently exists in the rundown
        if (!(String(id) in rundownTable)) {
            errors.push(`Item with id ${id} does not exist in the rundown`);
            continue;
        }

        // Validate state property if present
        if ('state' in item && item.state !== undefined) {
            const validStates = ['In', 'Out1', 'Out2'];
            if (!validStates.includes(item.state)) {
                errors.push(`Item with id ${id} has invalid state '${item.state}'. Valid states are: ${validStates.join(', ')}`);
                continue;
            }
        }

        // Prepare the data for patching (exclude 'id' property to make it immutable)
        const { id: _, ...updateData } = item as any;
        validUpdates.push({ id, data: updateData });
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
        logger.warn({ errors, patchDataLength: patchData.length }, 'Validation errors in patch request');
        return { success: false, message: `Validation failed: ${errors.length} errors`, errors };
    }

    // Create a store transaction to patch all the changes
    try {
        logger.debug({ validUpdates, rundownTableKeys: Object.keys(rundownTable) }, 'Starting store transaction');
        
        store.transaction(() => {
            for (const update of validUpdates) {
                const rowId = String(update.id);
                
                // Get current row data
                const currentRow = rundownTable[rowId];
                logger.debug({ rowId, updateData: update.data }, 'Processing update for row');
                
                // Update each property in the update data
                for (const [key, value] of Object.entries(update.data)) {
                    // Only update properties that exist in the RundownRow interface
                    if (key in currentRow) {
                        logger.debug({ rowId, key, value }, 'Setting cell for property');
                        
                        // Handle complex objects that need to be serialized
                        if (typeof value === 'object' && value !== null) {
                            // For objects like logicLayer or payload, store as JSON string or handle appropriately
                            if (key === 'logicLayer' || key === 'payload') {
                                store.setCell('rundown-1', rowId, key, JSON.stringify(value));
                            }
                        } else {
                            // For simple values (string, number, boolean)
                            store.setCell('rundown-1', rowId, key, value as string | number | boolean);
                        }
                    } else {
                        logger.debug({ key }, 'Skipping key - not found in RundownRow interface');
                    }
                }
            }
        });

        logger.info({ updatedIds: validUpdates.map(u => u.id) }, `Successfully processed patch request for ${validUpdates.length} items`);
        return { success: true, message: `Successfully updated ${validUpdates.length} items` };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error during transaction';
        logger.error({ error: errorMessage, validUpdates }, 'Error during store transaction');
        return { success: false, message: `Transaction failed: ${errorMessage}` };
    }
}

/**
 * Retrieves the rundown from the TinyBase MergeableStore
 * @param store - The TinyBase MergeableStore instance
 * @returns An array of RundownRow objects with id property added, or an empty array if no rundown exists
 */
export function getRundown(store: MergeableStore): Array<RundownRow & { id: number }> {
    const rundown = store.getTable('rundown-1') as unknown as Record<string, RundownRow>;
    if (!rundown) {
        return [];
    }

    return Object.entries(rundown).map(([rowId, row]): RundownRow & { id: number } => {
        // Parse payload and logicLayer if they are JSON strings
        let parsedPayload = row.payload;
        let parsedLogicLayer = row.logicLayer;

        // Parse payload if it's a JSON string
        if (typeof row.payload === 'string') {
            try {
                parsedPayload = JSON.parse(row.payload);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
                logger.warn({ rowId, payload: row.payload, error: errorMessage }, 'Failed to parse payload JSON, using as-is');
                parsedPayload = row.payload as any;
            }
        }

        // Parse logicLayer if it's a JSON string
        if (typeof row.logicLayer === 'string') {
            try {
                parsedLogicLayer = JSON.parse(row.logicLayer);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
                logger.warn({ rowId, logicLayer: row.logicLayer, error: errorMessage }, 'Failed to parse logicLayer JSON, using as-is');
                parsedLogicLayer = row.logicLayer as any;
            }
        }

        return {
            id: Number(rowId),
            ...row,
            payload: parsedPayload,
            logicLayer: parsedLogicLayer
        };
    });
}