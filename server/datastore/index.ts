import type { MergeableStore } from "tinybase";
import type { Subcomposition } from "./interfaces";
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
    const rundownTable = store.getTable('rundown-1');
    if (!rundownTable) {
        const error = 'Rundown table not found in store';
        logger.error({}, error);
        return { success: false, message: error };
    }

    const errors: string[] = [];
    const validUpdates: Array<{ id: number; data: Record<string, any> }> = [];

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
        const { id: _, ...updateData } = item;
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
        
        // Create a mapping from API property names to TinyBase column names
        const propertyMapping: Record<string, string> = {
            'subCompositionId': 'subcompId',
            'subCompositionName': 'template', 
            'rundownName': 'name',
            'state': 'status'
        };
        
        store.transaction(() => {
            for (const update of validUpdates) {
                const rowId = String(update.id);
                
                // Get current row data
                const currentRow = rundownTable[rowId];
                logger.debug({ rowId, currentRowKeys: Object.keys(currentRow), updateData: update.data }, 'Processing update for row');
                
                // Merge the update data with current row (update data takes precedence)
                for (const [key, value] of Object.entries(update.data)) {
                    logger.debug({ key, value }, 'Processing key-value pair');
                    
                    // Handle payload object specially - merge rather than replace
                    if (key === 'payload' && typeof value === 'object' && value !== null) {
                        logger.debug({ payloadValue: value }, 'Processing payload object');
                        // Merge payload properties directly as cells
                        for (const [payloadKey, payloadValue] of Object.entries(value)) {
                            // Ensure payloadValue is a valid Cell type (string, number, or boolean)
                            if (typeof payloadValue === 'string' || typeof payloadValue === 'number' || typeof payloadValue === 'boolean') {
                                logger.debug({ rowId, payloadKey, payloadValue }, 'Setting cell for payload property');
                                store.setCell('rundown-1', rowId, payloadKey, payloadValue);
                            }
                        }
                    } else {
                        // Map API property names to TinyBase column names
                        const mappedKey = propertyMapping[key] || key;
                        
                        // Only update if the mapped key exists in current row
                        if (mappedKey in currentRow) {
                            logger.debug({ rowId, key, mappedKey, value }, 'Setting cell for direct property');
                            store.setCell('rundown-1', rowId, mappedKey, value);
                        } else {
                            logger.debug({ key, mappedKey }, 'Skipping key - mapped key not found in current row');
                        }
                    }
                }
                // Force listener to update on payload change, even if the animation state did not change
                store.setCell('rundown-1', rowId, 'update', Date.now());
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
 * @returns An array of Subcomposition objects or an empty array if no rundown exists
 */
export function getRundown(store: MergeableStore): Subcomposition[] | []{
    const rundown = store.getTable('rundown-1');
    if (!rundown) {
        return []
    }

    // Columns of the table with these headers will not be included in the payload object
    const keysNotInPayload = ['Id', 'status', 'layer', 'name', 'template', 'type', 'subcompId','order', 'appToken', 'appLabel', 'rundownId'];
    return Object.entries(rundown).map(([rowId, row]): Subcomposition => {
        const subCompId = row.subcompId;
        const subCompName = row.template;
        const state = row.status as 'In' | 'Out1' | 'Out2';
        const payload: Record<string, string | number | boolean> = {};

        // Collect all cells that are not the special ones
        for (const [cellId, cellValue] of Object.entries(row)) {
            if (!keysNotInPayload.includes(cellId)) {
                payload[cellId] = cellValue;
            }
        }

        return {
            id: Number(rowId),
            subCompositionId: subCompId,
            subCompositionName: subCompName,
            rundownName: row.name,
            state,
            payload
        } as Subcomposition;
    });
}