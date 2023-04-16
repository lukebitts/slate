import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HISTORY_SIZE, StoreSerializable } from 'src/app/canvas/canvas-object.store';
import { ArrowContent, CanvasFolder, CanvasObjectSerializable } from 'src/app/canvas/canvas.model';
import { HistoryList } from 'src/app/common/history-list';
import { Size2, uuid, Vec2 } from 'src/app/common/math';
import { ContentV1, FileV1, ObjectV1, ParserV1, V1 } from 'src/app/file-definition/file-v1';
import { FileRef, OurFile } from '../storage.service';
import { DEFAULT_META, FullStorageError, hasData, hasKind, hasLastAccess, hasName, hasRefCount, hasUuid, hasVersion, LocalStorageAsset, LocalStorageAssetLatest, LocalStorageAssetRef, LocalStorageAssetV0, LocalStorageFileLatest, LocalStorageMeta } from './local-storage.model';

const LOCAL_STORAGE_META = 'slate-meta';
const LOCAL_STORAGE_PREFIX = 'slate-';
const LOCAL_STORAGE_FILE_PREFIX = LOCAL_STORAGE_PREFIX + 'f-';
const LOCAL_STORAGE_ASSET_PREFIX = LOCAL_STORAGE_PREFIX + 'a-';


type IdentifiableFile = { uuid: string, file: OurFile };

@Injectable({
    providedIn: 'root'
})
export class LocalStorageService {

    //storageState$: BehaviorSubject<'free' | 'full'> = new BehaviorSubject('free' as any);
    files$: BehaviorSubject<FileRef[]> = new BehaviorSubject([] as any);
    error$ = new BehaviorSubject<string|null>(null as any);

    private _storage;
    private _files: IdentifiableFile[] = [];
    private _assets: Record<string, LocalStorageAsset | null> = {};
    private _assetsRefCountHistory: HistoryList<Record<string, number | null>> = new HistoryList(HISTORY_SIZE);

    constructor() {
        this._storage = window.localStorage;

        /*function func1(num: number) {
            return new Array((num * 1024) + 1).join('a')
        }

        var totalSize = 0;
        if (!localStorage.getItem('size')) {
            var i = 0;
            try {
                // Test up to 10 MB
                for (i = 0; i <= 10000; i += 250) {
                    localStorage.setItem('test', func1(i));
                }
            } catch (e) {
                localStorage.removeItem('test');
                totalSize = i ? i - 250 : 0;
            }
        }

        let localStorageSize = function () {
            let _lsTotal = 0, _xLen, _x;
            for (_x in localStorage) {
                if (!localStorage.hasOwnProperty(_x)) continue;
                _xLen = (localStorage[_x].length + _x.length) * 2;
                _lsTotal += _xLen;
            }
            return (_lsTotal / 1024).toFixed(2);
        }

        console.log('local storage size', totalSize);
        console.log('local storage used', localStorageSize());*/
    }

    private _setMeta(meta: LocalStorageMeta) {
        try {
            this._storage.setItem(LOCAL_STORAGE_META, JSON.stringify(meta));
        } catch (e) {
            throw new FullStorageError(`FullStorageError: ${e}`);
        }
    }

    private _getOrInitMeta(): LocalStorageMeta {
        let meta = this._storage.getItem(LOCAL_STORAGE_META);
        let parsed: LocalStorageMeta;
        if (meta !== null) {
            try {
                let tryParsed: unknown = JSON.parse(meta);
                if (hasVersion(tryParsed)) {
                    // VERSION 0
                    if (tryParsed.version === 0) {
                        parsed = { ...tryParsed, version: 0 };
                    }
                    // VERSION 1
                    else if (tryParsed.version === 1) {
                        if (hasLastAccess(tryParsed)) {
                            parsed = { ...tryParsed, version: 1 };
                        } else {
                            throw new SyntaxError('[LocalStorageService] missing lastAccess');
                        }
                    }
                    // UNKNOWN VERSION
                    else {
                        throw new SyntaxError('[LocalStorageService] unknown version');
                    }

                } else {
                    throw new SyntaxError('[LocalStorageService] missing version');
                }
            } catch (e) {
                if (e instanceof SyntaxError) {
                    //console.warn(`[LocalStorageService] found invalid metadata. Replacing. (${e}) (${meta})`);
                    parsed = { ...DEFAULT_META };
                } else {
                    throw e;
                }
            }
        } else {
            parsed = { ...DEFAULT_META };
        }
        this._setMeta(parsed);
        return parsed;
    }

    private _visitParseFile(val: string, onV1: (f: V1) => void | null) {
        let parsed: unknown = JSON.parse(val);
        if (hasVersion(parsed)) {
            // VERSION 1
            if (parsed.version === 1) {
                let v1 = FileV1.fromObject(parsed);
                if (onV1) onV1(v1);
                // UNKNOWN VERSION
            } else {
                throw new SyntaxError('[LocalStorageService] unknown version');
            }
        } else {
            throw new SyntaxError('[LocalStorageService] missing version');
        }
    }

    private _visitParseAsset(val: string, onV0: (f: LocalStorageAssetV0) => void | null) {
        let parsed: unknown = JSON.parse(val);
        if (hasKind(parsed)) {
            if (parsed.kind === 'image') {
                if (hasVersion(parsed)) {
                    if (parsed.version === 0) {
                        if (hasUuid(parsed) && hasData(parsed) && hasRefCount(parsed)) {
                            onV0({ ...parsed, kind: 'image', version: 0 });
                        } else {
                            throw new SyntaxError('[LocalStorageService] missing properties');
                        }
                    } else {
                        throw new SyntaxError('[LocalStorageService] unknown version');
                    }
                } else {
                    throw new SyntaxError('[LocalStorageService] missing version');
                }
            } else {
                throw new SyntaxError('[LocalStorageService] unknown kind');
            }
        } else {
            throw new SyntaxError('[LocalStorageService] missing kind');
        }
    }

    private _loadFilesAndAssets(): [IdentifiableFile[], Record<string, LocalStorageAsset | null>] {
        let files: IdentifiableFile[] = [];
        let assets: Record<string, LocalStorageAsset | null> = {};
        for (const [key, val] of Object.entries(localStorage)) {

            if (key.startsWith(LOCAL_STORAGE_FILE_PREFIX)) {
                try {
                    this._visitParseFile(val, (f) => {
                        files.push({ uuid: f.uuid, file: f });
                    });
                } catch (e) {
                    continue;
                }
            } else if (key.startsWith(LOCAL_STORAGE_ASSET_PREFIX)) {
                try {
                    this._visitParseAsset(val, (a) => {
                        assets[key] = a;
                    });
                } catch (e) {
                    continue;
                }
            } else {
                continue;
            }
        }
        return [files, assets];
    }

    init(): void {
        try {
            let meta = this._getOrInitMeta();
            if (meta.version === 0 || meta.version === 1) {
                this._setMeta({ ...DEFAULT_META });
            } else {
                //console.warn(`[LocalStorageService] unknown meta version. Replacing it.`);
                this._setMeta({ ...DEFAULT_META });
            }

            let [files, assets] = this._loadFilesAndAssets();
            this._files = files;
            this._assets = assets;
            this.addRefCountToHistory();

            this._broadcastFiles();
            this.error$.next(null);
        } catch (e) {
            if (e instanceof FullStorageError) {
                this.error$.next('full');
            } else {
                throw e;
            }
        }
    }

    private _broadcastFiles() {
        this.files$.next(this._files.map(f => {
            if (ParserV1.hasVersion(f.file)) {
                if (f.file.version === 1) {
                    return new FileRef(f.file.uuid, f.file.name, 'local', new Date(f.file.lastAccess));
                } else {
                    throw new Error('unknown version');
                }
            } else {
                throw new Error(`missing file version`);
            }
        }));
    }

    createFile(name: string): LocalStorageFileLatest {
        let file: LocalStorageFileLatest = {
            version: 1 as const,
            uuid: uuid(),
            name: name,
            data: null,
            lastAccess: new Date().toISOString(),
            //lastObjectId: 0,
        };
        try {
            localStorage.setItem(`${LOCAL_STORAGE_FILE_PREFIX}${file.uuid}`, JSON.stringify(file));
            this.error$.next(null);
        } catch (e) {
            this.error$.next('full');
            throw new FullStorageError(`FullStorageError: ${e}`);
        }
        this._files.splice(0, 0, { uuid: file.uuid, file: file });
        this._broadcastFiles();
        return file;
    }

    createImage(data: string): LocalStorageAssetRef {
        let image: LocalStorageAssetLatest = {
            kind: 'image',
            version: 0 as const,
            uuid: uuid(),
            data: data,
            refCount: 1,
        };
        const assetName = `${LOCAL_STORAGE_ASSET_PREFIX}${image.uuid}`;
        this._assets[assetName] = image;
        return { handle: assetName };
    }

    commitImage(handle: string) {
        if (this._assets[handle]) {
            try {
                localStorage.setItem(handle, JSON.stringify(this._assets[handle]));
                this.error$.next(null);
            } catch (e) {
                this.error$.next('full')
                throw new FullStorageError(`FullStorageError: ${e}`);
            }
        } else {
            throw new Error(`could not commit image with handle ${handle}`);
        }
    }

    moveImageRefCount(handle: string, delta: number) {
        let asset = this._assets[handle];
        if (asset) {
            asset.refCount += delta;
        } else {
            //throw new Error(`could not moveImageRefCount image with handle ${handle}`);
            console.warn(`could not moveImageRefCount image with handle ${handle}`);
        }
    }

    getImageRefCount(handle: string): number | null {
        return this._assets[handle]?.refCount ?? null;
    }

    deleteIfNoRefsLeft(handle: string) {
        let toDelete = this._assets[handle];
        if (!toDelete) throw new Error('');
        if (toDelete.refCount <= 0) {
            localStorage.removeItem(handle);
        }
    }

    addRefCountToHistory() {
        let assetsRefCount: Record<string, number | null> = {};
        for (const [k, a] of Object.entries(this._assets)) {
            if (!a) throw new Error('');
            assetsRefCount[k] = a.refCount;
        }
        this._assetsRefCountHistory.next(assetsRefCount);
    }

    undo() {
        this._assetsRefCountHistory.undo();

        for (const k of Object.keys(this._assets)) {
            let refCountHistory = this._assetsRefCountHistory.get();
            let asset = this._assets[k];
            if (asset) {
                asset.refCount = refCountHistory[k] ?? 0;
            }
        }
    }

    redo() {
        this._assetsRefCountHistory.redo();

        for (const k of Object.keys(this._assets)) {
            let refCountHistory = this._assetsRefCountHistory.get();
            let asset = this._assets[k];
            if (asset) {
                asset.refCount = refCountHistory[k] ?? 0;
            }
        }
    }

    resetAssets() {
        this._assets = {};
        this._assetsRefCountHistory = new HistoryList(HISTORY_SIZE);
    }

    saveData(uuid: string, root: StoreSerializable) {
        let fileKey = `${LOCAL_STORAGE_FILE_PREFIX}${uuid}`;
        let item = localStorage.getItem(fileKey);
        if (!item) throw new Error('Could not find file to save it');

        let newSave: LocalStorageFileLatest | null = null;
        try {
            this._visitParseFile(item, (f) => {
                newSave = {
                    ...f,
                    data: {
                        lastObjectId: root.lastObjectId,
                        data: FileV1.fromModel(root.data),
                    },
                    lastAccess: new Date().toISOString(),
                };
            });

            if (!newSave) throw new Error('');

            localStorage.setItem(fileKey, JSON.stringify(newSave));

            // We ignore the assets here, since the localStorage information for them is outdated
            // and LocalStorageService already has the latest asset information
            let [files, assets] = this._loadFilesAndAssets();
            this._files = files;

            this._broadcastFiles();
        } catch (e) {
            throw e;
        }

    }

    getFileData(ref: FileRef): OurFile {
        let file = this._files.find(f => f.uuid === ref.uuid);
        if (file) return file.file;
        throw new Error('unknown file');
    }
}
