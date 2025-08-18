export interface ConnectionRow {
    appToken: string;
    type: string;
    label: string;
    updatedAt: number | null;
    model: string; // JSON string of the model
}