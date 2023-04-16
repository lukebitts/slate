import { Injectable, OnInit } from "@angular/core";
import { BehaviorSubject, map, merge, Observable, single } from "rxjs";
import { StoreSerializable } from "../canvas/canvas-object.store";
import { CanvasFolder, CanvasObjectSerializable } from "../canvas/canvas.model";
import { uuid } from "../common/math";
import { ObjectV1, V1 } from "../file-definition/file-v1";
import { GoogleDriveService } from "./google-drive-service/google-drive.service";
import { LocalStorageService } from "./local-storage/local-storage.service";


export type OurFile = V1;

export type StorageKind = 'local' | 'drive' | 'none'; 
export class FileRef {
    constructor(
        public uuid: string,
        public name: string,
        public storage: StorageKind,
        public lastAccess: Date,
    ) {}
}

export class AssetRef {
    constructor(
        public id: string,
        public storage: StorageKind,
    ) {}
}

@Injectable({
    "providedIn": "root"
})
export class StorageService {

    private _files$: BehaviorSubject<FileRef[]> = new BehaviorSubject([] as FileRef[]);
    private _localFiles: FileRef[] = [];
    private _driveFiles: FileRef[] = [];
    files$: Observable<FileRef[]> = this._files$;
    currentFile$: BehaviorSubject<FileRef|null> = new BehaviorSubject(null as any);
    error$: BehaviorSubject<string|null> = new BehaviorSubject(null as any);

    constructor(private _localStorageService: LocalStorageService, private _driveService: GoogleDriveService) {
        _localStorageService.init();

        _localStorageService.files$.subscribe((files) => {
            if(!files) return;
            this._localFiles = files;
            this._files$.next([]);
        });
        _driveService.files$.subscribe((files) => {
            if(!files) return;
            this._driveFiles = files;
            this._files$.next([]);
        });
        this.files$ = this.files$.pipe(map((files:FileRef[]) =>{
            /*return [...this._localFiles, ...this._driveFiles].sort((a, b) => {
                return a.lastAccess.getTime() < b.lastAccess.getTime() ? 1 : -1;
            });*/
            return [
                ...this._driveFiles.map(f => {
                    return f;
                }),
                ...this._localFiles.map(f => {
                    return f;
            })].sort((a, b) => {
                return a.lastAccess.getTime() < b.lastAccess.getTime() ? 1 : -1;
            });
        }));

        _localStorageService.error$.subscribe((e) => {
            this.error$.next(e);
        });

        _driveService.error$.subscribe((e) => {
            this.error$.next(e);
        });
    }

    reset() {
        this._localFiles = [];
        this._files$.next([]);
        this.currentFile$.next(null);
        this.error$.next(null);
    }

    getFiles(): FileRef[] {
        return this._files$.value;
    }

    getAssets(): AssetRef[] {
        let current = this.currentFile$.value;
        if(!current) throw new Error('');
        let storage = current.storage;

        if(storage === 'local') {
            return Object.entries(this._localStorageService['_assets']).map(([k, v]) => {
                return {
                    id: k,
                    storage: 'local'
                }
            });
        } else if(storage === 'drive') {
            return Object.entries(this._driveService['_assets']).map(([k, v]) => {
                return {
                    id: k,
                    storage: 'drive'
                }
            });
        } else {
            throw new Error('');
        }
    }

    async createFile(name: string, storage: StorageKind): Promise<FileRef> {
        let file;
        if(storage == 'local') {
            const localFile = this._localStorageService.createFile(name);
            file = new FileRef(localFile.uuid, localFile.name, 'local', new Date());
        //} else if(storage == 'none') {
            //file = new FileRef(uuid(), name, 'none', new Date(), '');
        } else if(storage == 'drive') {
            const driveFile = await this._driveService.createFile(name);
            file = new FileRef(driveFile.uuid, driveFile.name, 'drive', new Date());
        } else {
            throw new Error('[StorageService::createFile] invalid storage kind');
        }
        return file;
    }

    createImage(data: string): AssetRef {
        let current = this.currentFile$.value;
        if(!current) throw new Error('');
        let storage = current.storage;

        if(storage === 'local') {
            let imageRef = this._localStorageService.createImage(data);

            return {
                id: imageRef.handle,
                storage: storage
            }
        } else if (storage === 'drive') {
            let imageRef = this._driveService.createImage(data);

            return {
                id: imageRef.handle,
                storage: storage
            }
        } else {
            throw new Error('');
        }
    }

    async commitImage(id: string) {
        let current = this.currentFile$.value;
        if(!current) throw new Error('');
        let storage = current.storage;

        if(storage == 'local') {
            this._localStorageService.commitImage(id);
        } else if(storage == 'drive') {
            await this._driveService.commitImage(id, current);
        } else {
            throw new Error('');
        }
    }

    moveImageRefCount(handle: string, delta: number) {
        let current = this.currentFile$.value;
        if(!current) throw new Error('');
        let storage = current.storage;

        if(storage == 'local') {
            this._localStorageService.moveImageRefCount(handle, delta);
        } else {
            this._driveService.moveImageRefCount(handle, delta);
        }
    }

    getImageRefCount(handle: string): number|null {
        let current = this.currentFile$.value;
        if(!current) throw new Error('');
        let storage = current.storage;

        if(storage == 'local') {
            return this._localStorageService.getImageRefCount(handle);
        } else {
            return this._driveService.getImageRefCount(handle);
        }
    }

    getLoadedImageData(handle: string): string|null {
        let current = this.currentFile$.value;
        if(!current) throw new Error('');
        let storage = current.storage;

        if(storage === 'local') {
            let localAsset = this._localStorageService['_assets'][handle];
            return localAsset?.data??null;
        } else if (storage === 'drive') {
            let driveAsset = this._driveService['_assets'][handle];
            if(driveAsset?.body.refKind === 'loaded') {
                return driveAsset?.body.data??null;
            }
            return null;
        } else {
            throw new Error('');
        }
    }

    async getImageData(handle: string): Promise<string|null> {
        let current = this.currentFile$.value;
        if(!current) throw new Error('');
        let storage = current.storage;

        if(storage === 'local') {
            let localAsset = this._localStorageService['_assets'][handle];
            return localAsset?.data??null;
        } else if (storage === 'drive') {

            let driveAsset = this._driveService['_assets'][handle];
            if(driveAsset?.body.refKind === 'loaded') {
                return driveAsset?.body.data??null;
            } else if (driveAsset?.body.refKind === 'unloaded') {
                await this._driveService.loadImage(driveAsset);
                return driveAsset.body.data;
            }

            throw new Error(`error loading image: ${handle}`);
        } else {
            throw new Error('');
        }
    }

    openFile(ref: FileRef) {
        this.error$.next(null);
        if(ref.storage === 'local') {
            this.currentFile$.next(ref);
            localStorage.setItem('slate-last', JSON.stringify({
                uuid: ref.uuid,
                storage: ref.storage,
            }));
        } else if (ref.storage === 'drive') {
            this.currentFile$.next(ref);
            localStorage.setItem('slate-last', JSON.stringify({
                uuid: ref.uuid,
                storage: ref.storage,
            }));
        }
    }

    async getFileData(ref: FileRef): Promise<OurFile> {
        if(ref.storage === 'local') {
            return this._localStorageService.getFileData(ref);
        } else if (ref.storage === 'drive') {
            return (await this._driveService.getFileData(ref))!;
        } else {
            throw new Error('');
        }
    }

    async saveDataForCurrent(root: StoreSerializable) {
        let cur = this.currentFile$.value;
        if(!cur) {
            throw new Error('[StorageService::saveDataForCurrent] trying to save data without loading a file');
        }
        if(cur.storage == 'local') {
            let idx = this._localFiles.findIndex(f => f.uuid == cur!.uuid);
            if(idx == -1) throw new Error('')
            let file = this._localFiles[idx];
            this._localStorageService.saveData(file.uuid, root);
        } else if(cur.storage == 'drive') {
            let idx = this._driveFiles.findIndex(f => f.uuid == cur!.uuid);
            if(idx == -1) throw new Error('')
            let file = this._driveFiles[idx];
            await this._driveService.saveData(file.uuid, root);
        } else {
            throw new Error('[StorageService::saveDataForCurrent] unsuported storage type');
        }
    }

    async deleteIfNoRefsLeft(ref: AssetRef) {
        if(ref.storage === 'local') {
            this._localStorageService.deleteIfNoRefsLeft(ref.id);
        } else if (ref.storage === 'drive') {
            await this._driveService.deleteIfNoRefsLeft(ref.id);
        } else {
            throw new Error('');
        }
    }

    addRefCountToHistory() {
        let current = this.currentFile$.value;
        if(!current) throw new Error('[StorageService::addRefCountingToHistory] No file open');
        let storage = current.storage;

        if(storage === 'local') {
            this._localStorageService.addRefCountToHistory();
        } else if (storage === 'drive') {
            this._driveService.addRefCountToHistory();
        } else {
            throw new Error('');
        }
    }

    undo() {
        let current = this.currentFile$.value;
        if(!current) throw new Error('');
        let storage = current.storage;

        if(storage === 'local') {
            this._localStorageService.undo();
        } else if (storage === 'drive') {
            this._driveService.undo();
        } else {
            throw new Error('');
        }
    }

    redo() {
        let current = this.currentFile$.value;
        if(!current) throw new Error('');
        let storage = current.storage;

        if(storage === 'local') {
            this._localStorageService.redo();
        } else if (storage === 'drive') {
            this._driveService.redo();
        } else {
            throw new Error('');
        }
    }
}