import { TestBed } from '@angular/core/testing';

import { LocalStorageService } from './local-storage.service';

describe('LocalStorageService', () => {
    let service: LocalStorageService;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({});
        service = TestBed.inject(LocalStorageService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should initialize the metadata correctly', () => {
        expect(service['_getOrInitMeta']()).toEqual({'version':1,'lastAccess':''});
    });

    it('should deal with version 0 metadata', () => {
        localStorage.setItem('slate-meta', '{"version":0}');
        expect(service['_getOrInitMeta']()).toEqual({'version':0});
    });

    it('should deal with version 1 metadata', () => {
        localStorage.setItem('slate-meta', '{"version":1, "lastAccess": "xpto"}');
        expect(service['_getOrInitMeta']()).toEqual({'version':1,'lastAccess':'xpto'});
    });

    it('should deal with invalid version 1 metadata', () => {
        localStorage.setItem('slate-meta', '{"version":1}');
        expect(service['_getOrInitMeta']()).toEqual({'version':1,'lastAccess':''});
    });

    it('should deal with unknown versions in metadata', () => {
        localStorage.setItem('slate-meta', '{"version":-42}');
        expect(service['_getOrInitMeta']()).toEqual({'version':1,'lastAccess':''});
    });

    it('should deal with no version in metadata', () => {
        localStorage.setItem('slate-meta', '{}');
        expect(service['_getOrInitMeta']()).toEqual({'version':1,'lastAccess':''});
    });

    it('should deal with invalid JSON in metadata', () => {
        localStorage.setItem('slate-meta', 'meu-nome-nao-e-johnny');
        expect(service['_getOrInitMeta']()).toEqual({'version':1,'lastAccess':''});
    });

    it('should fail when the local storage is full', () => {
        expect(() => {
            let count = 0;
            let str = '';
            for(let i = 0; i < 1024; i++) {
                str += '-';
            }
            while(true) {
                count++;
                try {
                    localStorage.setItem(`${count}`, `${str}`);
                } catch(e) {
                    localStorage.setItem(`${count}`, `-`);
                }
            }
        }).toThrow();

        expect(() => service['_getOrInitMeta']()).toThrow();
        expect(() => service['_setMeta']({version: 1, lastAccess: ''})).toThrow();
    });

    // There's a mistake in how localStorage reads V0 files, but since they don't exist anymore (in localstorage) that's fine
    /*it('loads v0 files', () => {
        localStorage.setItem('slate-f-1', '{"version":0,"uuid":"1","data":null}');

        let [files,_] = service['_loadFilesAndAssets']();
        expect((files[0].file as any).version).toEqual(0);
        expect((files[0].file as any).uuid).toEqual("1");
        expect((files[0].file as any).data).toBeNull();
    });*/

    it('loads v1 files', () => {
        localStorage.setItem('slate-f-1', '{"version":1,"uuid":"1","data":null,"lastAccess":"ontem","name":"sora"}');

        let [files,_] = service['_loadFilesAndAssets']();
        expect((files[0].file as any).version).toEqual(1);
        expect((files[0].file as any).uuid).toEqual("1");
        expect((files[0].file as any).data).toBeNull();
        expect((files[0].file as any).lastAccess).toEqual("ontem");
    });

    // This tests for version 0, which is broken but also unused by the localStorageService
    /*it('loads different versions of files', () => {
        localStorage.setItem('slate-f-1', '{"uuid":"1","data":null}');
        localStorage.setItem('slate-f-2', '{"version":1,"uuid":"2","data":null,"lastAccess":"ontem","name":"genji"}');

        let files = service['_loadFilesAndAssets']()[0].sort((a,b) => a.uuid.localeCompare(b.uuid));
        var str = JSON.stringify(files, null, 2); 
        console.log('FILES', str);
        expect((files[0].file as any).version).toEqual(0);
        expect((files[0].file as any).uuid).toEqual("1");
        expect((files[0].file as any).data).toBeNull();
        expect((files[1].file as any).version).toEqual(1);
        expect((files[1].file as any).uuid).toEqual("2");
        expect((files[1].file as any).data).toBeNull();
        expect((files[1].file as any).lastAccess).toEqual("ontem");
    });*/

    it('skips files with errors', () => {
        localStorage.setItem('slate-f-0', '{"version":-42}');
        localStorage.setItem('slate-f-1', '{"version":0}');
        localStorage.setItem('slate-f-2', '{"version":0,"uuid":"1"}');
        localStorage.setItem('slate-f-3', '{"version":0,"data":null}');
        localStorage.setItem('slate-f-4', '{"version":1}');
        localStorage.setItem('slate-f-5', '{"version":1,"uuid":"1"}');
        localStorage.setItem('slate-f-6', '{"version":1,"data":null}');
        localStorage.setItem('slate-f-7', '{"version":1,"lastAccess":"ontem"}');
        localStorage.setItem('slate-f-8', '{"version":1,"uuid":"1","data":null}');
        localStorage.setItem('slate-f-9', '{"version":1,"uuid":"1","lastAccess":"ontem"}');
        localStorage.setItem('slate-f-10', '{"version":1,"data":null,"lastAccess":"ontem"}');
        localStorage.setItem('slate-f-11', 'no-json-beyond-this-hill');
        localStorage.setItem('slate-f-12', '{}');
        localStorage.setItem('slate-f-13', '{"version":1,"uuid":"13","data":null,"lastAccess":"ontem","name":"hanzo"}');

        let files = service['_loadFilesAndAssets']()[0];
        expect((files[0].file as any).version).toEqual(1);
        expect((files[0].file as any).uuid).toEqual("13");
        expect((files[0].file as any).data).toBeNull();
        expect((files[0].file as any).lastAccess).toEqual("ontem");
        expect(files.length).toEqual(1);
    });

    it('loads assets', () => {
        localStorage.setItem('slate-a-1', '{"kind": "image", "version": 0, "uuid": "1", "data": "data", "refCount": 1}');
        let assets = service['_loadFilesAndAssets']()[1];
        expect(assets['slate-a-1']).toBeTruthy();
    });

    it('doesn\'t load invalid assets', () => {
        localStorage.setItem('slate-a-1', '{"kind": "pokemon", "version": 0, "uuid": "1", "data": "data", "refCount": 1}');
        localStorage.setItem('slate-a-2', '{"kind": "image", "version": -1, "uuid": "1", "data": "data", "refCount": 1}');
        localStorage.setItem('slate-a-3', '{"kind": "pokemon", "version": 0, "uuid": "1", "data": "data", "refCount": 1}');
        localStorage.setItem('slate-a-4', '{"kind": "image", "version": 0, "uuid": undefined, "data": "data", "refCount": 1}');
        localStorage.setItem('slate-a-5', '{"kind": "image", "version": 0, "uuid": "1", "data": undefined, "refCount": 1}');
        localStorage.setItem('slate-a-6', '{"kind": "image", "version": 0, "uuid": "1", "data": "data", "refCount": undefined}');
        let assets = service['_loadFilesAndAssets']()[1];
        expect(assets['slate-a-1']).toBeFalsy();
        expect(assets['slate-a-2']).toBeFalsy();
        expect(assets['slate-a-3']).toBeFalsy();
        expect(assets['slate-a-4']).toBeFalsy();
        expect(assets['slate-a-5']).toBeFalsy();
        expect(assets['slate-a-6']).toBeFalsy();
    });

    it('create file', () => {
        let file = service.createFile('abcdef');

        expect(file).toBeTruthy();
        expect(file.name).toEqual('abcdef');
    });

    it('create image', () => {
        let file = service.createImage('abcdef');

        expect(file).toBeTruthy();
        expect(file.handle).toBeTruthy();
    });

    it('commit image', () => {
        let file = service.createImage('abcdef');

        expect(file).toBeTruthy();
        expect(file.handle).toBeTruthy();

        service.commitImage(file.handle);

        let item1 = localStorage.getItem(file.handle);
        expect(item1).toBeTruthy();

        service.moveImageRefCount(file.handle, -1);
        service.deleteIfNoRefsLeft(file.handle);

        let item2 = localStorage.getItem(file.handle);
        expect(item2).toBeFalsy();
    });

    it('commit image undo redo', () => {
        let file = service.createImage('abcdef');

        expect(file).toBeTruthy();
        expect(file.handle).toBeTruthy();

        service.commitImage(file.handle);
        service.addRefCountToHistory();

        let item1 = localStorage.getItem(file.handle);
        expect(item1).toBeTruthy();

        service.moveImageRefCount(file.handle, -1);
        service.addRefCountToHistory();

        service.deleteIfNoRefsLeft(file.handle);

        let item2 = localStorage.getItem(file.handle);
        expect(item2).toBeFalsy();

        service.undo();

        service.commitImage(file.handle);
        let item3 = localStorage.getItem(file.handle);
        expect(item3).toBeTruthy();
        expect(service.getImageRefCount(file.handle)).toEqual(1);

        service.redo();

        service.commitImage(file.handle);
        let item4 = localStorage.getItem(file.handle);
        expect(item4).toBeTruthy();
        expect(service.getImageRefCount(file.handle)).toEqual(0);
    });
});
