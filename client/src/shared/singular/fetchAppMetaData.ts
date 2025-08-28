import { SingularAppMetaData } from "./interfaces/singular-app-metadata";

export const fetchAppMetaData = async (appToken: string): Promise<SingularAppMetaData> => {
    const response = await fetch(`https://app.singular.live/apiv2/controlapps/${appToken}`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    if (
        !data ||
        !data?.outputUrl ||
        !data?.id ||
        !data?.publicControlUrl ||
        !data?.publicControlApiUrl
    ) {
        throw new Error('Invalid singular meta data received when fetching https://app.singular.live/apiv2/controlapps');
    }

    return data as SingularAppMetaData;
};