export interface SingularAppMetaData {
    id: number;
    userId: number;
    accountId: number;
    thumbnail: string | null;
    marketplaceID: string | null;
    updatedAt: string;
    createdAt: string;
    type: string;
    outputUrl: string;
    broadcastOutputUrl: string;
    publicControlUrl: string;
    publicControlApiUrl: string;
    publicCommandApiUrl: string;
    publicModelApiUrl: string;
    appTemplateId: number;
    appTemplateVersion: number;
    compositionJson: string;
    name: string;
    folderId: string;
    favorite: boolean;
    compositionId: number;
    datastoreId: string;
}