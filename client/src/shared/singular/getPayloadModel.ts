import { SingularModel, Model } from './interfaces/singular-model';

/**
 * Gets the payload model (model array) of a subcomposition by its ID
 * @param model - The SingularModel containing subcompositions
 * @param subcompositionId - The ID of the subcomposition to find
 * @returns The model array (payload) of the matching subcomposition, or empty array if not found
 */
export function getPayloadModel(model: SingularModel, subcompositionId: string): Model[] {
    const subcomposition = model.subcompositions.find(sub => sub.id === subcompositionId);
    return subcomposition?.model || [];
}