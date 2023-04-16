import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Vec2 } from '../common/math';
import { ClipboardService } from '../common/services/clipboard.service';
import { StorageService } from '../storage/storage.service';
import { CanvasObjectStore } from './canvas-object.store';
import { FolderContent, TextContent } from './canvas.model';

import { CanvasService } from './canvas.service';


class MockClipboardService {

}

describe('CanvasService', () => {
    let service: CanvasService;
    let store: CanvasObjectStore;
    let storage: StorageService;
    let clipboard: ClipboardService;

    let oldNavigatorRead = navigator.clipboard.read;
    let oldNavigatorWrite = navigator.clipboard.write;

    beforeEach(() => {
        TestBed.configureTestingModule({
            
        });
        service = TestBed.inject(CanvasService);
        store = TestBed.inject(CanvasObjectStore);
        storage = TestBed.inject(StorageService);
        clipboard = TestBed.inject(ClipboardService);

        service.reset();
        store.reset();
        storage.reset();
        localStorage.clear();

        navigator.clipboard.read = oldNavigatorRead;
        navigator.clipboard.write = oldNavigatorWrite;
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should undo correctly from a fresh file', async () => {
        let file = await storage.createFile('test-file', 'local');
        await storage.openFile(file);

        storage.undo(); //since openFile adds the initial state to the history, we have to undo twice to get an error.
        expect(() => storage.undo()).toThrowError('[HistoryList::undo] nothing to undo');
    });

    it('test adding images from the clipboard and deleting them aftwards', async () => {
        let file = await storage.createFile('test-file', 'local');
        await storage.openFile(file);

        service.toolbarDragStart('container', new Vec2(30, 100));
        service.objectDragEnd();

        let c1 = store.getObject(1);
        expect(c1).toBeTruthy();
        c1 = c1!;

        expect(c1.content.kind).toEqual('container');

        service.select(c1, false);

        expect(c1.selected).toBeTrue();

        let pasteEvt = { 
            preventDefault: function(){}, 
            clipboardData: {
                getData: function(t: string): string|null {
                    if(t == 'image/png') {
                        return IMAGE_DATA_URL;
                    }
                    return null
                }
            }
        };

        navigator.clipboard.read = async function(): Promise<ClipboardItems> {
            function dataURLtoBlob(dataurl: string): Blob {
                let arr = dataurl.split(',');
                let mime = arr[0].match(/:(.*?);/)![1];
                let bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
                while(n--){
                    u8arr[n] = bstr.charCodeAt(n);
                }
                return new Blob([u8arr], {type:mime});
            }

            let k = dataURLtoBlob(IMAGE_DATA_URL);
            let d: ClipboardItemData = new Promise((r, _) => { return r(k); })
            return [
                new ClipboardItem({'image/png': d})
            ];
        }

        await service.paste(pasteEvt, false);

        let img1 = store.getObject(4);
        expect(img1).toBeTruthy();
        img1 = img1!;
        expect(img1.content.kind).toEqual('image');

        let assets = storage.getAssets();
        expect(assets.length).toEqual(1);
        expect(storage.getImageRefCount(assets[0].id)).toEqual(1);

        service.save();
        
        service.select(img1, false);
        let it: any;
        navigator.clipboard.write = async function(items) {
            it = items;
        };
        await service.copySelected({ preventDefault: function(){} });

        navigator.clipboard.read = async function(): Promise<ClipboardItems> {
            return it;
        };
        await service.paste(pasteEvt, false);

        let img2 = store.getObject(5);
        expect(img2).toBeTruthy();
        img2 = img2!;
        expect(img2.content.kind).toEqual('image');

        expect(storage.getImageRefCount(assets[0].id)).toEqual(2);
        
        service.delete(img1);
        
        expect(storage.getImageRefCount(assets[0].id)).toEqual(1);

        service.delete(img2);

        expect(storage.getImageRefCount(assets[0].id)).toEqual(0);

        expect(JSON.parse(localStorage.getItem(assets[0].id)!).refCount).toEqual(1);

        await service.save();

        expect(localStorage.getItem(assets[0].id)).toBeFalsy();
    });

    it('test adding images from the clipboard and deleting them aftwards', async () => {
        let file = await storage.createFile('test-file', 'local');
        await storage.openFile(file);

        service.toolbarDragStart('container', new Vec2(30, 100));
        service.objectDragEnd();

        let c1 = store.getObject(1);
        expect(c1).toBeTruthy();
        c1 = c1!;

        expect(c1.content.kind).toEqual('container');

        service.select(c1, false);

        expect(c1.selected).toBeTrue();

        let pasteEvt = { 
            preventDefault: function(){}, 
            clipboardData: {
                getData: function(t: string): string|null {
                    if(t == 'image/png') {
                        return IMAGE_DATA_URL;
                    }
                    return null
                }
            }
        };

        navigator.clipboard.read = async function(): Promise<ClipboardItems> {
            function dataURLtoBlob(dataurl: string): Blob {
                let arr = dataurl.split(',');
                let mime = arr[0].match(/:(.*?);/)![1];
                let bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
                while(n--){
                    u8arr[n] = bstr.charCodeAt(n);
                }
                return new Blob([u8arr], {type:mime});
            }

            let k = dataURLtoBlob(IMAGE_DATA_URL);
            let d: ClipboardItemData = new Promise((r, _) => { return r(k); })
            return [
                new ClipboardItem({'image/png': d})
            ];
        }

        await service.paste(pasteEvt, false);

        let img1 = store.getObject(4);
        expect(img1).toBeTruthy();
        img1 = img1!;
        expect(img1.content.kind).toEqual('image');

        let assets = storage.getAssets();
        expect(assets.length).toEqual(1);
        expect(storage.getImageRefCount(assets[0].id)).toEqual(1);

        service.save();
        
        service.select(img1, false);
        let it: any;
        navigator.clipboard.write = async function(items) {
            it = items;
        };
        await service.copySelected({ preventDefault: function(){} });

        navigator.clipboard.read = async function(): Promise<ClipboardItems> {
            return it;
        };
        await service.paste(pasteEvt, false);

        let img2 = store.getObject(5);
        expect(img2).toBeTruthy(); 
        img2 = img2!;
        expect(img2.content.kind).toEqual('image');

        expect(storage.getImageRefCount(assets[0].id)).toEqual(2);
        
        service.delete(img1);
        
        expect(storage.getImageRefCount(assets[0].id)).toEqual(1);

        service.delete(img2);

        expect(storage.getImageRefCount(assets[0].id)).toEqual(0);

        expect(JSON.parse(localStorage.getItem(assets[0].id)!).refCount).toEqual(1);

        await service.save();

        expect(localStorage.getItem(assets[0].id)).toBeFalsy();
    });

    it('test copying a folder with elements inside', async () => {
        let file = await storage.createFile('test-file', 'local');
        await storage.openFile(file);

        let folder = service.addContent({}, FolderContent.empty('no-name', '', ''));

        service.setCurrentRoot(folder, true, false);

        let ta = service.addContent({}, new TextContent('a'));
        let tb = service.addContent({}, new TextContent('b'));

        service.arrowHandleDragStart(Vec2.z(), ta as any);
        service.arrowHandleDrop(tb as any);
        service.arrowHandleDragEnd();

        service.setCurrentRoot(null, true, false);

        service.select(folder as any, false, undefined);

        service.copySelected({preventDefault: () => {}});

        expect(() => service.cloneFolder({}, folder!.id, folder?.content as any, null)).not.toThrow();
        //service.paste({preventDefault: () => {}}, false);
    });
});


const IMAGE_DATA_URL = `data:image/png;base64,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`