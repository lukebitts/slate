import { EventEmitter, Injectable, NgZone, OnInit, Output, Renderer2 } from "@angular/core";
import { DialogService } from "@ngneat/dialog";
import { BehaviorSubject } from "rxjs";
import { HISTORY_SIZE, StoreSerializable } from "src/app/canvas/canvas-object.store";
import { CanvasFolder, CanvasObjectSerializable } from "src/app/canvas/canvas.model";
import { HistoryList } from "src/app/common/history-list";
import { uuid } from "src/app/common/math";
import { FileV1, ParserV1, V1 } from "src/app/file-definition/file-v1";
import { StoragePopupComponent } from "../storage-popup/storage-popup.component";
import { FileRef, OurFile } from "../storage.service";
import { DriveStorageAssetRef, DriveStorageAssetV0 } from "./google-drive.model";


// TODO(developer): Set to client ID and API key from the Developer Console
const CLIENT_ID = '529429673293-5d4kr5vol72e3q41l2fnr206ocfmg81f.apps.googleusercontent.com';
const API_KEY = 'AIzaSyDv62ZMHID7Bn-oB7BpIvvz6scESapesJ8';

// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = 'https://www.googleapis.com/auth/drive.file,https://www.googleapis.com/auth/drive.appdata,https://www.googleapis.com/auth/drive.appfolder,https://www.googleapis.com/auth/drive.install,https://www.googleapis.com/auth/drive.file,https://www.googleapis.com/auth/drive.resource';

declare var gapi: any;
declare var google: any;

export type DriveServiceStatus = 'loading' | 'loaded' | 'authenticating' | 'auth_success';
type DriveFileKind = 'file' | 'folder';

type MaybeOurFile = { id: string, name: string, modifiedTime: Date, kind: DriveFileKind, file: OurFile | null };
export type DriveFileLatest = V1;

class Folder {
    kind = 'folder' as const;
    constructor(
        public ref: any,
        public children: Child[],
        public images: Record<string, DriveStorageAssetV0>,
    ) { }
}

class File {
    kind = 'file' as const;
    constructor(
        public ref: any
    ) { }
}

type Child = Folder | File;

@Injectable({
    "providedIn": "root"
})
export class GoogleDriveService {
    private _tokenClient: any;
    private _gapiInited = false;
    private _gisInited = false;

    private _script1Loaded = false;
    private _script2Loaded = false;

    private _files: MaybeOurFile[] = [];
    private _folders: Record<string, Folder> = {};

    private _openNext: string | null = null;

    //private _assets: Record<string, DriveStorageAssetV0 | null> = {};
    private _assets: Record<string, DriveStorageAssetV0 | null> = {};
    private _assetHistory: HistoryList<Record<string, DriveStorageAssetV0 | null>> = new HistoryList(HISTORY_SIZE);
    private _assetsRefCountHistory: HistoryList<Record<string, number | null>> = new HistoryList(HISTORY_SIZE);

    //status$ = new BehaviorSubject<DriveServiceStatus>('loading');
    loading$ = new BehaviorSubject<boolean>(true);
    loaded$ = new BehaviorSubject<boolean>(false);
    authenticating$ = new BehaviorSubject<boolean>(false);
    authenticated$ = new BehaviorSubject<boolean>(false);
    downloading$ = new BehaviorSubject<boolean>(false);
    error$ = new BehaviorSubject<string|null>(null);
    files$ = new BehaviorSubject<FileRef[] | null>(null);

    constructor(private _ngZone: NgZone, private _dialog: DialogService) { }

    private _loadDriveScripts(renderer: Renderer2) {
        if (this._script1Loaded && this._script2Loaded) return;

        if (!this._script1Loaded) {
            this._script1Loaded = true;
            const scriptElement1 = this._loadJsScript(renderer, 'https://apis.google.com/js/api.js');
            scriptElement1.onload = () => {

                this._gapiLoaded();
            }
            scriptElement1.onerror = () => {

                this._script1Loaded = false;
                this._loadDriveScripts(renderer);
            }
        }

        if (!this._script2Loaded) {
            this._script2Loaded = true;
            const scriptElement2 = this._loadJsScript(renderer, 'https://accounts.google.com/gsi/client');
            scriptElement2.onload = () => {

                this._gisLoaded();
            }
            scriptElement2.onerror = () => {

                this._script2Loaded = false;
                this._loadDriveScripts(renderer);
            }
        }
    }

    private _loadJsScript(renderer: Renderer2, src: string): HTMLScriptElement {
        const script = renderer.createElement('script');
        script.type = 'text/javascript';
        script.src = src;
        renderer.appendChild(document.body, script);
        return script;
    }

    /**
     * Callback after api.js is loaded.
     */
    private _gapiLoaded() {
        gapi.load('client', () => this._initializeGapiClient());
    }

    /**
     * Callback after the API client is loaded. Loads the
     * discovery doc to initialize the API.
     */
    private async _initializeGapiClient() {
        let item: any = localStorage.getItem('slate-drive-token');
        if (item) {
            let r = await gapi.auth.setToken(JSON.parse(item));

        }
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
        }).then((ok: any) => {

        })
            .catch((error: any) => {

            });
        this._gapiInited = true;
        this._maybeFinishLoading();
    }

    /**
     * Callback after Google Identity Services are loaded.
     */
    private _gisLoaded() {
        this._tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES.replaceAll(',', ' '),
            callback: async (resp: any) => {

                if (resp.error !== undefined) {
                    throw (resp);
                }
                try {
                    localStorage.setItem('slate-drive-token', JSON.stringify(resp));
                } catch (e) {

                }
                //this.status$.next('auth_success');
                await this._listFiles();
                this._ngZone.run(() => {
                    if(this.error$.value === 'token' || this.error$.value === 'files' ) {
                        this.error$.next(null);
                    }
                    this.authenticated$.next(true);
                });
            },
        });

        this._gisInited = true;
        this._maybeFinishLoading();
    }

    /**
     * Enables user interaction after all libraries are loaded.
     */
    private _maybeFinishLoading() {
        if (this._gapiInited && this._gisInited) {
            this._ngZone.run(async () => {
                this.loaded$.next(true);
                this.loading$.next(false);

                if (gapi.client.getToken() != null) {


                    this.authenticated$.next(true);
                    await this._listFiles().catch(async r => {

                        await this.authenticate();
                        this._files = [];
                        this.authenticated$.next(false);
                        this.files$.next([]);
                        this.loaded$.next(true);
                        this.loading$.next(false);
                        //localStorage.removeItem('slate-drive-token');
                    });
                } else {

                    this._files = [];
                    this.authenticated$.next(false);
                    this.files$.next([]);
                    this.loaded$.next(true);
                    this.loading$.next(false);
                    /*try {
                        await this.authenticate();
                    } catch(e) {
                        const dialogRef = this._dialog.open(
                            StoragePopupComponent, { 
                                size: 'storagePopup',
                                enableClose: false,
                                closeButton: false,
                                //backdrop: false,
                            }
                        );
                    }*/
                }
            });
        }
    }

    private async _listFiles() {
        //this._files = [];
        let response;
        try {
            response = await gapi.client.drive.files.list({
                //'pageSize': 10,
                'fields': 'files(id, name, createdTime, modifiedTime, size, mimeType, parents, trashed)',
            });
        } catch (err: any) {
            //this happens when the token is invalid
            throw err;
        }
        const files = response.result.files;
        if (!files || files.length == 0) {
            return;
        }

        let folders: Record<string, Folder> = {};

        files.forEach((f: any) => {
            if (f.trashed) return;

            if (f.mimeType === 'application/vnd.google-apps.folder') {
                if (f.id in folders) {
                    folders[f.id].ref = f;
                } else {
                    folders[f.id] = new Folder(f, [], {});
                }
            } else if (f.mimeType === 'text/plain') {
                for (let p of f.parents) {
                    if (p in folders) {
                        folders[p].children.push(new File(f));
                    } else {
                        folders[p] = new Folder(null, [new File(f)], {});
                    }
                }
            } else if (f.mimeType.startsWith('image/')) {
                let imgAsset: DriveStorageAssetV0 = {
                    kind: 'image',
                    version: 0,
                    name: f.name,
                    driveId: f.id,
                    isUploaded: true,
                    refCount: 1,
                    body: {
                        refKind: 'unloaded',
                        data: null,
                    }
                };
                for (let p of f.parents) {
                    let internalUuid: string = f.name.replace('img-', '').replace(/([^\.]+$)/, '');
                    internalUuid = internalUuid.slice(0, internalUuid.length-1);
                    
                    if (p in folders) {
                        folders[p].images[internalUuid] = imgAsset;
                    } else {
                        folders[p] = new Folder(null, [], {[internalUuid]: imgAsset});
                    }
                }
                /*let internalUuid: string = f.name.replace('img-', '').replace('.png', '');
                this._assets[internalUuid] = {
                    kind: 'image',
                    version: 0,
                    name: f.name,
                    driveId: f.id,
                    isUploaded: true,
                    refCount: 1,
                    body: {
                        refKind: 'unloaded',
                        data: null,
                    }
                }*/
            }
        });

        for (let [k, f] of Object.entries(folders)) {
            if (f.ref === null) {
                f.children.forEach(c => {
                    this._files.push({
                        id: c.ref.id,
                        name: c.ref.name,
                        modifiedTime: new Date(c.ref.modifiedTime),
                        kind: c.ref.mimeType === 'text/plain' ? 'file' : 'folder',
                        file: null
                    });
                })
            } else {
                let lastModified = f.ref.modifiedTime;
                if(f.children.length > 0) {
                    lastModified = f.children[0].ref.modifiedTime;
                }
                this._files.push({
                    id: f.ref.id,
                    name: f.ref.name,
                    modifiedTime: new Date(lastModified),
                    kind: f.ref.mimeType === 'text/plain' ? 'file' : 'folder',
                    file: null
                });
            }
        }



        this._folders = folders;

        this.files$.next(this._files.map(f => {
            return new FileRef(f.id, f.name, 'drive', f.modifiedTime);
        }));
    }

    async authenticate() {
        if (!this._gapiInited || !this._gisInited) return;



        await this._tokenClient.requestAccessToken({ prompt: '' }, (err: any, resp: any) => {

        });
    }

    signout() {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken(null);

            //localStorage.removeItem('slate-drive-token');
        }
    }

    init(renderer: Renderer2) {
        this._loadDriveScripts(renderer);
    }

    initAndOpenFileAfter(renderer: Renderer2, fileUuid: string) {
        this._loadDriveScripts(renderer);
        this._openNext = fileUuid;
    }

    async getFileData(file: FileRef): Promise<OurFile | null> {

        this.downloading$.next(true);
        let ret;

        let fileData = this._files.find(f => f.id == file.uuid);

        if (!fileData) throw new Error(`unknown file ${file.uuid} ${file.name}`);

        if (fileData.kind == 'file') {
            await gapi.client.drive.files.get({
                fileId: file.uuid,
                alt: "media"
            }).then((res: any) => {

                if (res.status == 200) {
                    let parsed = JSON.parse(res.body);
                    if (ParserV1.hasVersion(parsed)) {
                        if (parsed.version === 1) {
                            ret = FileV1.fromObject(parsed);
                        } else {
                            throw new Error('unknown version');
                        }
                    } else {
                        throw new Error('missing version');
                    }
                }
            }).catch(async (err: any) => {
                throw err;
            });
        } else if (fileData.kind == 'folder') {
            if (!(fileData.id in this._folders)) throw new Error('');

            let dataFile = this._folders[fileData.id].children.find(c => c.kind === 'file' && c.ref.name === 'data');
            if (!dataFile) throw new Error('');

            await gapi.client.drive.files.get({
                fileId: dataFile.ref.id,
                alt: 'media'
            }).then((res: any) => {

                if (res.status == 200) {
                    if (res.body.trim() === '') {
                        ret = FileV1.default();
                    } else {
                        let parsed = JSON.parse(res.body);
                        if (ParserV1.hasVersion(parsed)) {
                            if (parsed.version === 1) {
                                ret = FileV1.fromObject(parsed);
                            } else {
                                throw new Error('unknown version');
                            }
                        } else {
                            throw new Error('missing version');
                        }
                    }
                }
                for(const [k,v] of Object.entries(this._assets)) {
                    if(!v) throw new Error();
                    v.body = {
                        refKind: 'unloaded',
                        data: null
                    };
                }
                this._assets = this._folders[fileData!.id].images;
            }).catch((e: any) => {
                if(!this.error$.value) {
                    this.notifyError('files');
                }
            });

        } else {
            throw new Error('unknown file kind');
        }


        this.downloading$.next(false);
        return ret ?? null;
    }

    async createFile(name: string): Promise<DriveFileLatest> {
        let file: DriveFileLatest = {
            version: 1 as const,
            uuid: '',
            name: name,
            data: null,
            lastAccess: new Date().toISOString(),
        };

        // Create a metadata object for the new folder
        const folderMetadata = {
            name: name,
            mimeType: 'application/vnd.google-apps.folder'
        };

        // Use the files.create method to create the new folder
        await gapi.client.drive.files.create({
            resource: folderMetadata
        }).then(async (response: any) => {

            const dataFileMeta = {
                name: 'data',
                mimeType: "text/plain",
                parents: [response.result.id],
            };

            await gapi.client.drive.files.create({
                resource: dataFileMeta,
            }).then((response: any) => {

                file.uuid = dataFileMeta.parents[0];
            }).catch((error: any) => {
                console.error('Error creating data file: ', error);
            });

        }).catch((error: any) => {
            console.error('Error creating folder: ', error);
        });

        await this._listFiles();

        return file;
    }

    async saveData(uuid: string, root: StoreSerializable) {
        if (uuid in this._folders) {
            let dataFile = this._folders[uuid].children.find(c => c.ref && c.ref.name === 'data');
            if (!dataFile) throw new Error('no data file found');

            let fileRef = this._files.find((v) => v.id === uuid);
            if(fileRef) {
                fileRef.modifiedTime = new Date();
                this.files$.next(this._files.map(f => {
                    return new FileRef(f.id, f.name, 'drive', f.modifiedTime);
                }));
            } else {
                throw new Error('');
            }

            let save: DriveFileLatest = {
                version: 1,
                uuid: uuid,
                lastAccess: new Date().toISOString(),
                name: dataFile.ref.name,
                data: {
                    lastObjectId: root.lastObjectId,
                    data: FileV1.fromModel(root.data),
                },
            };

            var contentBlob = new Blob([JSON.stringify(save)], {
                'type': 'text/plain'
            });

            await new Promise((resolve, reject) => {
                this._updateFileContent(dataFile!.ref.id, contentBlob, () => {                   
                    this.error$.next(null);
                    resolve(null);
                }, () => {
                    reject();
                });
            }).catch((err) => {
                //this.error$.next('save');
                //this.authenticated$.next(false);
                //this._files = [];
                //this.files$.next([]);
                this.notifyError('save');
            });
        } else {
            throw new Error('cant save non-folder file');
        }
    }

    private notifyError(error: string) {
        this.error$.next(error);
        this._files = [];
        this.authenticated$.next(false);
        this.files$.next([]);
    }

    private _updateFileContent(fileId: any, contentBlob: any, success: any, error: any) {
        var xhr = new XMLHttpRequest();
        xhr.responseType = 'json';
        xhr.onreadystatechange = function () {
            if (xhr.readyState != XMLHttpRequest.DONE) {
                return;
            }
            if(xhr.status === 200) {
                success(xhr.response);
            } else {
                error();
            }
        };
        xhr.open('PATCH', 'https://www.googleapis.com/upload/drive/v3/files/' + fileId + '?uploadType=media');
        xhr.setRequestHeader('Authorization', 'Bearer ' + gapi.auth.getToken().access_token);
        xhr.send(contentBlob);
    }

    createImage(data: string): DriveStorageAssetRef {
        let image: DriveStorageAssetV0 = {
            kind: 'image',
            version: 0 as const,
            name: uuid(),
            driveId: '',
            isUploaded: false,
            refCount: 1,
            body: {
                refKind: 'loaded',
                data: data,
            }
        };

        const assetName = `${image.name}`;
        this._assets[assetName] = image;
        return { handle: assetName };
    }

    moveImageRefCount(handle: string, delta: number) {
        let asset = this._assets[handle];
        if (asset) {
            asset.refCount += delta;
        } else {
            //throw new Error(`could not moveImageRefCount image with handle ${handle}`);
            if(handle != '') {
                console.warn(`could not moveImageRefCount image with handle ${handle}`);
            }
        }
    }

    addRefCountToHistory() {
        let assetsRefCount: Record<string, number | null> = {};
        for (const [k, a] of Object.entries(this._assets)) {
            if (!a) throw new Error('');
            assetsRefCount[k] = a.refCount;
        }
        this._assetsRefCountHistory.next(assetsRefCount);
        this._assetHistory.next(JSON.parse(JSON.stringify(this._assets)));
    }

    undo() {
        this._assetsRefCountHistory.undo();
        this._assetHistory.undo();

        for (const k of Object.keys(this._assets)) {
            let refCountHistory = this._assetsRefCountHistory.get();
            let assetHistory = this._assetHistory.get();
            let asset = this._assets[k];
            if (asset) {
                asset.refCount = refCountHistory[k] ?? 0;
                /*if(assetHistory[k] && assetHistory[k]?.body.refKind === 'drive'){
                    asset.body = assetHistory[k]!.body;
                }*/
            }
        }
    }

    redo() {
        this._assetsRefCountHistory.redo();
        this._assetHistory.redo();

        for (const k of Object.keys(this._assets)) {
            // remove later (refcount is already in assets history)
            let refCountHistory = this._assetsRefCountHistory.get();
            let assetHistory = this._assetHistory.get();
            let asset = this._assets[k];
            if (asset) {
                asset.refCount = refCountHistory[k] ?? 0;
                /*if(assetHistory[k]!.body.refKind === 'local') {
                    asset.body = assetHistory[k]!.body;
                }*/
            }
        }
    }

    getImageRefCount(handle: string): number | null {
        return this._assets[handle]?.refCount ?? null;
    }

    async deleteIfNoRefsLeft(handle: string) {
        let toDelete = this._assets[handle];
        if (!toDelete) throw new Error('');
        
        if (toDelete.refCount <= 0 && toDelete.isUploaded) {
            //localStorage.removeItem(handle);
            var requestData = {
                method: 'DELETE',
                path: '/drive/v3/files/' + toDelete.driveId
            };

            // Make the API request to delete the file
            await gapi.client.request(requestData).then((result: any) => {
                toDelete!.isUploaded = false;
            });
        }
    }

    async loadImage(img: DriveStorageAssetV0) {

        if (img.body.refKind === 'unloaded' && img.isUploaded === true) {
            await gapi.client.drive.files.get({
                fileId: img.driveId,
                alt: 'media',
                responseType: 'arraybuffer',
                encoding: null
            }).then(async (res: any) => {

                var imageType = res.headers['content-type'];
                //var base64 = Buffer.from(res.body, 'utf8').toString('base64');
                let bytes = new Uint8Array(res.body.length);
                for (let i = 0; i < res.body.length; i++) {
                    bytes[i] = res.body.charCodeAt(i);
                }
                let blob = new Blob([bytes], { type: "image/png" });

                //var dataURI = 'data:' + imageType + ';base64,' + base64;
                var dataURI = URL.createObjectURL(blob);
                var base64 = '';
                
                await new Promise((resolve, reject) => {
                    let reader = new FileReader();
                    reader.readAsDataURL(blob);
                    reader.onload = () => {
                        let base64String = reader.result;
                        resolve(base64String);
                    };
                    reader.onerror = () => {
                        reject(reader.error);
                    };
                }).then((val) => {
                    if(typeof val === 'string') {
                        base64 = val;
                    } else {
                        throw new Error('');
                    }
                });

                img.body = {
                    refKind: 'loaded',
                    data: base64
                };
            }).catch((err: any) => {
                //this.error$.next('token');
                //this._files = [];
                //this.authenticated$.next(false);
                //this.files$.next([]);
                if(!this.error$.value) {
                    this.notifyError('token');
                }
                this.loaded$.next(true);
                this.loading$.next(false);
            })
        } else {
            throw new Error('img already loaded');
        }
    }

    async commitImage(handle: string, file: FileRef) {
        let asset = this._assets[handle];
        if (asset) {
            if (!asset.body.data && asset.body.refKind !== 'unloaded') throw new Error(`image has no data to be commited ${JSON.stringify(asset, null, 2)}`);
            if (!asset.isUploaded && asset.refCount > 0) {

                if(asset.body.refKind === 'loaded') {
                    const imageMimeRgx = /data:image\/(.*?);base64,/;
                    let imageMimeResult = imageMimeRgx.exec(asset.body.data);

                    if(!imageMimeResult) throw new Error('');
                    
                    let imageMime = imageMimeResult[0];
                    let imageType = imageMimeResult[1];

                    const boundary = '-------314159265358979323846';
                    const delimiter = "--" + boundary + "\r\n";
                    const close_delim = "\r\n--" + boundary + "--";
                    var fileName = `img-${handle}.${imageType}`;
                    var contentType = `image/${imageType}`;
                    var metadata = {
                        'name': fileName,
                        'mimeType': contentType,
                        'parents': [file.uuid],
                        'appProperties': {
                            'internalUuid': handle,
                            'refCount': asset.refCount,
                        }
                    };
                    var multipartRequestBody = delimiter +
                        'Content-Type: application/json\r\n\r\n' +
                        JSON.stringify(metadata) + "\r\n" +
                        delimiter +
                        'Content-Type: ' + contentType + '\r\n' +
                        'Content-Transfer-Encoding: base64\r\n\r\n' +
                        asset.body.data.replace(imageMime, '') + '\r\n' +
                        close_delim;
                        
                    await gapi.client.request({
                        'path': 'https://www.googleapis.com/upload/drive/v3/files',
                        'method': 'POST',
                        'params': { 'uploadType': 'multipart' },
                        'headers': { 'Content-Type': 'multipart/form-data; boundary=' + boundary },
                        'body': multipartRequestBody
                    }).then((result: any) => {
                        console.log('image saved', result);

                        asset!.driveId = result.result.id;
                        asset!.isUploaded = true;
                        asset!.body = {
                            refKind: 'loaded',
                            data: asset!.body.data!
                        };
                    });
                } else {
                    throw new Error('cant upload unloaded image');
                }

            } else if (asset.isUploaded && asset.refCount > 0) {
                let metadata = {
                    appProperties: {
                        refCount: asset.refCount
                    }
                };
                await gapi.client.request({
                    method: 'PATCH',
                    path: '/drive/v3/files/' + asset.driveId,
                    params: {
                        uploadType: 'multipart'
                    },
                    headers: {
                        'Content-Type': 'application/json; charset=UTF-8',
                    },
                    body: JSON.stringify(metadata)
                }).then((result: any) => {
                    //
                });
            }
        } else {
            throw new Error(`could not commit image with handle ${handle}`);
        }
    }
}