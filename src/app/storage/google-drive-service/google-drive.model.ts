export type DriveStorageAssetV0 = {
    kind: 'image';
    version: 0;
    name: string;
    driveId: string;
    refCount: number;
    isUploaded: boolean;
    body: (
        {
            refKind: 'unloaded',
            data: null,
        }|
        {
            refKind: 'loaded',
            data: string,
        }
    )
}

export interface DriveStorageAssetRef {
    handle: string,
}