import { createLogger } from "../utils/logger.ts";
import type { RundownRow } from "../datastore/interfaces.ts";

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
    const row = store.getRow(tableId, rowId) as unknown as RundownRow;
    if (!row) {
        logger.error({ tableId, rowId }, 'Row not found in table');
        return;
    }

    const componentName = row.name;

    // Check for required properties
    if (!row.subCompositionId || !row.appToken) {
        logger.error({
            componentName,
            tableId,
            row
        }, 'Component missing required subCompositionId or appToken');
        return;
    }

    const subCompId = row.subCompositionId;
    const appToken = row.appToken;

    // Parse the payload if it's stored as a JSON string
    let payload = {};
    if (row.payload) {
        if (typeof row.payload === 'string') {
            try {
                payload = JSON.parse(row.payload);
            } catch (parseError) {
                logger.warn({
                    componentName,
                    tableId,
                    rowId,
                    payload: row.payload,
                    error: parseError instanceof Error ? parseError.message : 'Unknown error'
                }, 'Failed to parse payload JSON, using empty payload');
                payload = {};
            }
        } else {
            // Payload is already an object
            payload = row.payload;
        }
    }

    //Detect 'Start on Play' values for timers in the payload
    for (const [key, value] of Object.entries(payload)) {
        if (typeof value === 'string' && value.includes('::add-')) {
            const match = value.match(/::add-(\d+)/);
            if (match) {
                const addMs = parseInt(match[1], 10);
                (payload as any)[key] = Date.now() + addMs;
            }
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
        }, 'Singular Response to Patch request');

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
