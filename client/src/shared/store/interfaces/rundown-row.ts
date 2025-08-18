export interface RundownRow {
    subCompositionId: string;
    subCompositionName: string;
    state: 'In' | 'Out1' | 'Out2';
    logicLayer: {name: string; tag: string};
    payload: { [key: string]: number | string | boolean };
    appToken: string;
    name: string;
    rundownId: string;
    type: string;
    order: number;
    appLabel: string;
    update: number;
}