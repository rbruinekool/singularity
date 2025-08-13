import type { SingularModel } from "./interfaces.ts";

export function createSingularPayload(
    row: Record<string, any>,
    model: SingularModel
): Record<string, any> {
    const subcompId = row.subcompId;
    const subcomposition = model.subcompositions.find(
        (sub) => sub.id === subcompId
    );
    if (!subcomposition) {
        return {};
    }
    const payload: Record<string, any> = {};
    for (const field of subcomposition.model) {
        payload[field.id] = row[field.id];
    }
    return payload;
}