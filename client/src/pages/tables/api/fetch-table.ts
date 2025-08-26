import { Table } from "tinybase";

// Fetch data from selected sheet
const fetchTableFromSheet = async (webAppUrl: string, sheetName: string): Promise<Table | null> => {

    try {
        const url = new URL(webAppUrl);
        url.searchParams.set('apiCall', 'getTable');
        url.searchParams.set('sheetName', sheetName);

        const response = await fetch(url.toString(), {
            method: 'GET',
        });

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();

        // Add __headers__ row with keys from the first row
        //const firstRowKey = Object.keys(data)[0];
        const firstRow = data['0'] || {};
        const headerRow: Record<string, string> = {};
        Object.keys(firstRow).forEach((key) => {
            headerRow[key] = key;
        });
        data['__headers__'] = headerRow;

        //todo add assertion for table
        return data as Table;
    } catch (error) {
        console.error('Error fetching sheet data:', error);
        return null;
    }
};

export default fetchTableFromSheet;
