/**
 * Represents the Singular payload object containing key-value pairs of data
 * Keys are strings, values can be strings or numbers
 */
export interface Payload {
    [key: string]: string | number | boolean;
}

/**
 * Represents a Singular subcomposition object from the Singular Live API
 * Do note it is not exactly the same as some properties of the frontend are added as well
 */
export interface Subcomposition {
    /** Numeric ID representing the row key in the rundown table */
    id: number;
    /** Unique identifier for the subcomposition */
    subCompositionId?: string;
    /** Human-readable name of the subcomposition (template name) */
    subCompositionName?: string;
    /** Name of the rundown item */
    rundownName?: string;
    /** Whether this is the main composition or a sub-composition */
    mainComposition?: boolean;
    /** Current state of the composition (e.g., 'In', 'Out1', 'Out2') */
    state?: 'In' | 'Out1' | 'Out2';
    /** Data payload containing key-value pairs for the composition */
    payload: Payload;
}