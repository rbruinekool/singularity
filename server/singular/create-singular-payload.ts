import type { SingularModel } from "./interfaces.ts";

export function createSingularPayload(
    row: Record<string, any>,
    model: SingularModel
): Record<string, any> {
    if(!row) return {};
    const subcompId = row.subcompId;
    const subcomposition = model.subcompositions.find(
        (sub) => sub.id === subcompId
    );
    if (!subcomposition) {
        return {};
    }
    const payload: Record<string, any> = {};
    for (const field of subcomposition.model) {
        if (!row.hasOwnProperty(field.id)) {
            console.warn(`Field ${field.id} not found in row ${row.name}. Skipping.`);
            continue;
        }

        let value = row[field.id];
        
        //Check for the specific :add- prefix used for 'Start on Play' timers
        if(typeof row[field.id] === 'string' && row[field.id].includes('::add-')){
            const addedTime = row[field.id].replace('::add-', '');
            const minutes = Number(addedTime);
            if (!isNaN(minutes)) {
                value = Date.now() + minutes;
            }

        }
        payload[field.id] = value
    }
    return payload;
}