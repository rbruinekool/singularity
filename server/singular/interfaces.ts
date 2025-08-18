export interface SingularModel {
    id: string;
    name: string;
    state?: string;
    model: Model[];
    logicLayer?: {
        name: string;
        tag: string;
    } | null;
    snapshot?: string | null;
    subcompositions: Subcomposition[];
}

export interface Subcomposition {
    id: string;
    name: string;
    state: string;
    model: Model[];
    logicLayer: {
        name: string;
        tag: string;
    };
    snapshot: string;
    subcompositions: Subcomposition[];
}

export interface Model {
    id: string;
    title: string;
    type: string;
    index: number;
    defaultValue: string;
    resetValue: string;
    immediateUpdate: boolean;
    selections: Selection[];
    source?: string;
    sourceUrl?: string;
    hideTitle: boolean;
    hidden: boolean;
    style: boolean;
    format: string;
}

export interface Selection {
    id: string;
    title: string;
}


/**
 * Represents a Singular connection row from the frontend client
 */
export interface SingularConnection {
    /** Unique authentication token for accessing the Singular Live Control API */
    appToken: string;
    /** JSON string containing the Singular composition model definition */
    model: string;
    /** Timestamp (in milliseconds) when this connection was last updated */
    updatedAt: number;
    /** Type identifier for the connection (e.g., 'singular', 'composition') */
    type: string;
    /** Human-readable display name for this connection */
    label: string;
}