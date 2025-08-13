import { createLogger } from "../utils/logger.ts";
import { createSingularPayload } from "./create-singular-payload.ts";
import type { SingularConnection, SingularModel } from "./interfaces.ts";

const logger = createLogger('patch-singular');

type AnimationState = 'In' | 'Out1' | 'Out2';

/**
 * Consolidated function to PATCH updates to Singular Live Control API
 * @param store - TinyBase store instance
 * @param tableId - The table ID where the row is located
 * @param rowId - The row ID to patch
 * @param animateTo - Optional animation state to transition to ('In', 'Out1', 'Out2')
 */
export const PatchSingular = async (
    store: any,
    tableId: string,
    rowId: string,
    animateTo?: AnimationState
) => {
    // Get the row from the store
    const row = store.getRow(tableId, rowId);
    if (!row) {
        logger.error({ tableId, rowId }, 'Row not found in table');
        return;
    }

    const componentName = row.name;

    // Check for required cells
    if (!store.hasCell(tableId, rowId, 'subcompId') || !store.hasCell(tableId, rowId, 'appToken')) {
        logger.error({ 
            componentName, 
            tableId, 
            rowId 
        }, 'Component missing required subcompId or appToken cells');
        return;
    }

    const subCompId = row.subcompId;
    const appToken = row.appToken;

    // Get connections table to find model data
    const connections = store.getTable('connections') as SingularConnection[];
    if (!connections) {
        logger.error({ 
            componentName, 
            tableId,
            rowId,
            subCompId 
        }, 'Table connections not found when patching Singular');
        return;
    }

    const connectionEntry = Object.values(connections).find(
        (entry: any) => entry.appToken === appToken
    );

    let payload = {};
    let model: SingularModel;

    // Always try to create payload if we have model data
    if (connectionEntry?.model && typeof connectionEntry.model === 'string') {
        try {
            model = JSON.parse(connectionEntry.model);
            payload = createSingularPayload(row, model) || {};
        } catch (e) {
            logger.error({ 
                error: e, 
                componentName, 
                tableId,
                rowId,
                appToken: appToken.substring(0, 8) + '...',
                subCompId 
            }, 'Failed to parse model JSON when creating Singular payload');
        }
    }

    // Build request body
    const requestBody: any = {
        subCompositionId: subCompId,
        payload: payload
    };

    // Add animation state if provided
    if (animateTo) {
        requestBody.state = animateTo;
        logger.info({ 
            componentName, 
            tableId,
            rowId,
            subCompId,
            animateTo,
            hasPayload: Object.keys(payload).length > 0
        }, 'Patching Singular with animation state');
    } else {
        logger.info({ 
            componentName, 
            tableId,
            rowId,
            subCompId,
            payloadKeys: Object.keys(payload)
        }, 'Patching Singular with payload update only');
    }

    // Send PATCH request to Singular Live Control API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
        const response = await fetch(`https://app.singular.live/apiv2/controlapps/${appToken}/control`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([requestBody]),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        logger.debug({ 
            componentName, 
            tableId,
            rowId,
            subCompId, 
            animateTo,
            response: data 
        }, 'Successfully sent control command to Singular Live');

    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name !== 'AbortError') {
            logger.error({ 
                error: error.message, 
                componentName, 
                tableId,
                rowId,
                subCompId, 
                appToken: appToken.substring(0, 8) + '...',
                animateTo 
            }, 'Failed to send control command to Singular Live');
        }
    }
};
