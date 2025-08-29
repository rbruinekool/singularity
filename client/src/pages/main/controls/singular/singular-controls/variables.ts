import { type Table } from "tinybase";

export const replaceCustomVariables = (variablesTable: Table, inputString: string): string => {
    return inputString.replace(/\$\((custom:[^)]+)\)/g, (match) => {
        const row = Object.values(variablesTable).find(row => row.name === match);
        return row ? String(row.value) : '';
    });
}