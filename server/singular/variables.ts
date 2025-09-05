import { type MergeableStore } from "tinybase";

export const replaceCustomVariables = (store: MergeableStore, inputString: string): string => {
    const table = store.getTable('variables');
    return inputString.replace(/\$\((custom:[^)]+)\)/g, (match) => {
        const row = Object.values(table).find(row => row.name === match);
        return row ? String(row.value) : '';
    });
}