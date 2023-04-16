import { doesKeysExist } from "src/app/common/parser";
import { V1 } from "src/app/file-definition/file-v1";

export function hasVersion(data: unknown): data is { version: number } {
    const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'version') && typeof data.version === 'number');
    return has;
}
export function hasLastAccess(data: unknown): data is { lastAccess: string } {
    const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'lastAccess') && typeof data.lastAccess === 'string');
    return has;
}
export function hasUuid(data: unknown): data is { uuid: string } {
    const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'uuid') && typeof data.uuid === 'string');
    return has;
}
export function hasData(data: unknown): data is { data: string } {
    const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'data') && typeof data.data === 'string');
    return has;
}
export function hasName(data: unknown): data is { name: string } {
    const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'name') && typeof data.name === 'string');
    return has;
}
export function hasKind(data: unknown): data is { kind: string } {
    const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'kind') && typeof data.kind === 'string');
    return has;
}
export function hasRefCount(data: unknown): data is { refCount: number } {
    const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'refCount') && typeof data.refCount === 'number');
    return has;
}

export const DEFAULT_META: LocalStorageMetaV1 = { version: 1, lastAccess: "" };
export interface LocalStorageMetaV0 {
    version: 0;
}
export interface LocalStorageMetaV1 {
    version: 1;
    lastAccess: string;
}

export type LocalStorageMeta = LocalStorageMetaV0 | LocalStorageMetaV1;

export class FullStorageError extends Error {
    constructor(message: string = 'Local storage is full') {
        super(message);
        const actualProto = new.target.prototype;
        if (Object.setPrototypeOf) { Object.setPrototypeOf(this, actualProto); }
        else { (this as any).__proto__ = actualProto; }
    }
}

/*export interface LocalStorageFileV0 {
    version: 0;
    uuid: string;
    data: string;
}

export interface LocalStorageFileV1 {
    version: 1;
    uuid: string;
    lastAccess: string;
    name: string;
    data: string;
}

export type LocalStorageFile = LocalStorageFileV0 | LocalStorageFileV1;
export type LocalStorageFileLatest = V1;//LocalStorageFileV1;*/

export type LocalStorageFileLatest = V1;

export interface LocalStorageAssetV0 {
    kind: 'image';
    version: 0;
    uuid: string;
    data: string;
    refCount: number;
}

export type LocalStorageAsset = LocalStorageAssetV0;
export type LocalStorageAssetLatest = LocalStorageAssetV0;

export interface LocalStorageAssetRef {
    handle: string,
}