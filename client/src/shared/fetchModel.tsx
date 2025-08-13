import { SingularModel } from "./singular/interfaces/singular-model";

export const fetchModel = async (appToken: string): Promise<SingularModel > => {
    const response = await fetch(`https://app.singular.live/apiv2/controlapps/${appToken}/model`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    if(!data || !data[0].subcompositions || !data[0].name || !data[0].id){
        throw new Error('Invalid singular model data received');
    }

    return data[0] as SingularModel;
};