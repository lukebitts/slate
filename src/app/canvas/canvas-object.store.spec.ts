import { TestBed } from '@angular/core/testing';
import { Size2, Vec2 } from '../common/math';

import { CanvasObjectStore, DEFAULT_INSERTION_POSITION, DEFAULT_INSERTION_SIZE } from './canvas-object.store';
import { ArrowContent, CanvasContainer, CanvasContent, CanvasFolder, CanvasId, CanvasObject, ContainerContent, FolderContent, idRef, isCanvasContainer, isCanvasParent, objectRef, TextContent } from './canvas.model';

describe('CanvasObjectStore', () => {
    let store: CanvasObjectStore;
    let curRoot: CanvasFolder|null;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        store = TestBed.inject(CanvasObjectStore);
        store.reset();

        let f = store.addContent(FolderContent.empty('my chemical folder', 'black', ''));
        store.setCurrentRoot(f);
        curRoot = f;
        //curRoot = null;
    });

    it('should be created', () => {
        expect(store).toBeTruthy();
    });

    it('should add objects', () => {
        const obj1 = store.addContent(new TextContent('aang'));
        const obj2 = store.addContent(ContainerContent.empty('katara'));
        const obj3 = store.addContent(FolderContent.empty('sokka', 'blue', ''));
        const obj4 = store.addArrow(new ArrowContent(objectRef(obj2), objectRef(obj1), null, false, false));

        const all: Record<CanvasId, CanvasObject<CanvasContent> | null> = (store as any)['_all'];

        expect(all[obj1.id]).toBe(obj1);
        expect(all[obj2.id]).toBe(obj2);
        expect(all[obj3.id]).toBe(obj3);
        expect(all[obj4.id]).toBe(obj4);

        expect(obj1.isRoot).toBeTrue();
        expect(obj2.isRoot).toBeTrue();
        expect(obj3.isRoot).toBeTrue();
        expect(obj4.isRoot).toBeTrue();
    });

    it('should build the correct hierarchy objects', () => {
        let pos = new Vec2(10, 10);
        let size = new Size2(10, 10);
        const obj1: CanvasContainer = store.addContent(ContainerContent.empty('magica'));
        let content = new TextContent('madoka');
        let obj2 = store.addContentWithParent(content, obj1, { position: pos, size: size });
        

        pos.x = 100;
        pos.y = 200;
        size.w = 300;
        size.h = 400;
        content.text = 'homura';

        const all: Record<CanvasId, CanvasObject<CanvasContent> | null> = (store as any)['_all'];
        expect(all[obj1.id]).toEqual(obj1);
        expect(obj1.position).toEqual(DEFAULT_INSERTION_POSITION);
        expect(obj1.size).toEqual(DEFAULT_INSERTION_SIZE);
        expect(isCanvasContainer(obj1)).toBeTrue();
        expect((obj1.content as ContainerContent).objects[0].content.kind).toEqual('text');
        expect(((obj1.content as ContainerContent).objects[0].content as TextContent).text).toEqual('madoka');
        expect((obj1.content as ContainerContent).objects[0].position).toEqual(new Vec2(10, 10));
        expect((obj1.content as ContainerContent).objects[0].size).toEqual(new Size2(10, 10));
        expect((obj1.content as ContainerContent).objects[0].parentId).toEqual(obj1.id);
        //expect(obj1.parentId).toEqual(0);
        expect(obj1.parentId).toEqual(curRoot?.id??0);

        expect(obj1.isRoot).toBeTrue();
        expect(obj2.isRoot).toBeFalse();

        if (isCanvasContainer(obj1)) {
            expect(all[obj1.content.objects[0].id]).toBe(obj1.content.objects[0]);
        } else {
            expect(false).toBe(true);
        }
    });

    it('should add new ones to selected list', () => {
        const obj1 = store.addContent(ContainerContent.empty('puella'), { selected: true });
        const obj2 = store.addContentWithParent(new TextContent('mami'), obj1);

        expect(isCanvasContainer(obj1)).toBeTrue();
        expect(obj1.selected).toBeTrue();

        expect((obj1.content as ContainerContent).objects[0].content.kind).toEqual('text');
        expect(((obj1.content as ContainerContent).objects[0].content as TextContent).text).toEqual('mami');
        expect((obj1.content as ContainerContent).objects[0].parentId).toEqual(obj1.id);
        expect((obj1.content as ContainerContent).objects[0].selected).toEqual(false);
        expect((obj1.content as ContainerContent).objects[0].editing).toEqual(false);
        expect((obj1.content as ContainerContent).objects[0].dragging).toEqual(false);
        expect((obj1.content as ContainerContent).objects[0].resizing).toEqual(false);

        const selected: CanvasObject<CanvasContent>[] = (store as any)['_selected'];
        expect(selected.length).toEqual(1);
        expect(selected[0]).toBe(obj1);

        expect(obj1.isRoot).toBeTrue();
        expect(obj2.isRoot).toBeFalse();
    });

    it('addContent should always make copies', () => {
        const cont1 = store.addContent(ContainerContent.empty('magi'), { selected: true });
        let obj1 = store.addContentWithParent(new TextContent('mami'), cont1, { selected: true });
        let foldr1 = store.addContentWithParent(FolderContent.empty('serafina', 'yellow', ''), cont1, { selected: true });
        store.setCurrentRoot(foldr1);
        let obj2 = store.addContent(new TextContent('kyubey'), { selected: true });
        store.setCurrentRoot(curRoot);

        const cont1Copy = store.addContent(cont1.content);

        expect(cont1).not.toBe(cont1Copy);
        expect(isCanvasContainer(cont1)).toBeTrue();
        expect(isCanvasContainer(cont1Copy)).toBeTrue();

        expect((cont1.content as ContainerContent).objects[0].content.kind).toEqual('text');
        expect(((cont1.content as ContainerContent).objects[0].content as TextContent).text).toEqual('mami');
        expect((cont1.content as ContainerContent).objects[1].content.kind).toEqual('folder');
        expect(((cont1.content as ContainerContent).objects[1].content as FolderContent).objects[0].content.kind).toEqual('text');
        expect((((cont1.content as ContainerContent).objects[1].content as FolderContent).objects[0].content as TextContent).text).toEqual('kyubey');

        expect((cont1Copy.content as ContainerContent).objects[0].content.kind).toEqual('text');
        expect(((cont1Copy.content as ContainerContent).objects[0].content as TextContent).text).toEqual('mami');
        expect((cont1Copy.content as ContainerContent).objects[1].content.kind).toEqual('folder');
        expect(((cont1Copy.content as ContainerContent).objects[1].content as FolderContent).objects[0].content.kind).toEqual('text');
        expect((((cont1Copy.content as ContainerContent).objects[1].content as FolderContent).objects[0].content as TextContent).text).toEqual('kyubey');

        ((cont1Copy.content as ContainerContent).objects[0].content as TextContent).text = 'sayaka';
        (cont1Copy.content as ContainerContent).objects[0].position.x = 100;
        (cont1Copy.content as ContainerContent).objects[0].position.y = 200;
        (cont1Copy.content as ContainerContent).objects[0].size.w = 100;
        (cont1Copy.content as ContainerContent).objects[0].size.h = 200;

        expect(((cont1.content as ContainerContent).objects[0].content as TextContent).text).toEqual('mami');
        expect((cont1.content as ContainerContent).objects[0].position.x).toEqual(0);
        expect((cont1.content as ContainerContent).objects[0].position.y).toEqual(0);
        expect((cont1.content as ContainerContent).objects[0].size.w).toEqual(0);
        expect((cont1.content as ContainerContent).objects[0].size.h).toEqual(0);

        expect(cont1.isRoot).toBeTrue();
        expect(cont1Copy.isRoot).toBeTrue();
        expect(obj1.isRoot).toBeFalse();
        expect(foldr1.isRoot).toBeFalse();
        expect(obj2.isRoot).toBeTrue();
    });

    it('expect errors if id is repeated', () => {
        const obj1 = store.addContent(new TextContent('Zuko'), { selected: true });
        (store as any)['_lastObjectId'] = obj1.id - 1;
        expect(function () { store.addContent(new TextContent('Zuko'), { selected: true }); }).toThrow();
    });

    it('expect errors if id is already selected', () => {
        (store as any)['_selected'] = [{ id: (store as any)['_lastObjectId'] + 1 }];
        expect(function () {
            let ct = store.addContent(new TextContent('Aang'), { selected: true });
        }).toThrow();
    });

    it('arrows should have objectRefs after loading a snapshot', () => {
        const obj1 = store.addContent(new TextContent('1'));
        const obj2 = store.addContent(ContainerContent.empty('1'));
        const arrow = store.addArrow(new ArrowContent(objectRef(obj1), objectRef(obj2), null, false, false));

        //expect((store as any)._lastObjectId).toEqual(3);
        expect((store as any)._lastObjectId).toEqual(4);

        let snap = store.createSnapshot();

        obj1.content.text = '2';
        obj2.content.title = '2';

        // This is added to make sure the store._lastObjectId will increase, but load the snapshot should
        // decrease it again.
        store.addContent(new TextContent('1'));

        store.loadSnapshot(snap);
        store.setCurrentRoot(curRoot);

        //expect((store as any)._lastObjectId).toEqual(3);
        expect((store as any)._lastObjectId).toEqual(4);

        let obj3 = store.getObject(obj1.id);
        let obj4 = store.getObject(obj2.id);
        
        expect(obj3).not.toEqual(obj1);
        expect(obj4).not.toEqual(obj2);

        expect(obj3).toBeTruthy();
        expect(obj4).toBeTruthy();

        expect(obj3!.content.kind).toEqual('text');
        expect((obj3!.content as TextContent).text).toEqual('1');

        expect(obj4!.content.kind).toEqual('container');
        expect((obj4!.content as ContainerContent).title).toEqual('1');

        let arrowObj = arrow;//(obj4!.content as ContainerContent).objects[0];
        expect(arrowObj).toBeTruthy();
        expect(arrowObj.content.kind).toEqual('arrow');
        expect((arrowObj.content as ArrowContent).start.kind).toEqual('object');
        expect((arrowObj.content as ArrowContent).end.kind).toEqual('object');
    });

    it('adding new objects after creating snapshot should not affect loading snapshot', () => {
        const obj1 = store.addContent(new TextContent('1'));
        let snap = store.createSnapshot();
        const obj2 = store.addContent(new TextContent('2'));
        store.loadSnapshot(snap);
        expect(store.getObject(obj2.id)).toBeFalsy();
    });

    it('loading the same snapshot multiple times should not cause issues', () => {
        const obj1 = store.addContent(new TextContent('1'));
        let snap = store.createSnapshot();
        store.loadSnapshot(snap);
        let snap2 = store.createSnapshot();
        store.loadSnapshot(snap);
        expect(snap).toEqual(snap2);
    });

    it('auxiliary structures are correct after a load and nothing is selected', () => {
        const obj1 = store.addContent(new TextContent('1'), { selected: true });
        let selected1 = (store as any)['_selected'] as any[];
        expect(selected1.findIndex(s => s.id == obj1.id)).not.toEqual(-1);
        let snap = store.createSnapshot();
        store.loadSnapshot(snap);
        let selected2 = (store as any)['_selected'] as any[];
        expect(selected2.findIndex(s => s.id == obj1.id)).toEqual(-1);
    });

    it('should select a canvas object', () => {
        const content = new TextContent('rectangle');
        const obj = store.addContent(content);
        store.setSelected(obj, true);
        expect(store.getSelected()).toContain(obj);
        expect(obj.selected).toBeTruthy();
    });

    it('should unselect a canvas object', () => {
        const content = new TextContent('rectangle');
        const obj = store.addContent(content);
        store.setSelected(obj, true);
        store.setSelected(obj, false);
        expect(store.getSelected()).not.toContain(obj);
        expect(obj.selected).toBeFalsy();
    });

    it('should not throw error when trying to select an already selected object', () => {
        const content = new TextContent('rectangle');
        const obj = store.addContent(content);
        store.setSelected(obj, true);
        expect(() => store.setSelected(obj, true)).not.toThrow();
    });

    it('should not throw error when trying to unselect an already unselected object', () => {
        const content = new TextContent('rectangle');
        const obj = store.addContent(content);
        store.setSelected(obj, false);
        expect(() => store.setSelected(obj, false)).not.toThrow();
    });

    it('should throw when the id is not in the list', () => {
        const content = new TextContent('rectangle');
        const obj = new CanvasObject(100, Vec2.z(), Size2.z(), content, null, false);

        expect(() => store.setSelected(obj, true)).toThrow();
        expect(() => store.setSelected(obj, true)).toThrow();
        expect(() => store.setSelected(obj, false)).toThrow();
        expect(() => store.setSelected(obj, false)).toThrow();
    });

    it('selecting a parent clear all the children', () => {
        const container = store.addContent(ContainerContent.empty(''));
        const obj = store.addContentWithParent(new TextContent(''), container);

        store.setSelected(obj, true);
        expect(obj.selected).toBeTrue();

        store.setSelected(container, true);
        expect(obj.selected).toBeFalse();
        expect(container.selected).toBeTrue();
    });

    it('selecting a child clears the parent', () => {
        const container = store.addContent(ContainerContent.empty(''));
        const obj = store.addContentWithParent(new TextContent(''), container);

        store.setSelected(container, true);
        expect(obj.selected).toBeFalse();
        expect(container.selected).toBeTrue();

        store.setSelected(obj, true);
        expect(obj.selected).toBeTrue();
        expect(container.selected).toBeFalse();
    });

    it('selecting a parent clear all the children, and setting root clears selection', () => {        
        const cont1 = store.addContent(ContainerContent.empty(''));
        const txt1 = store.addContentWithParent(new TextContent(''), cont1);
        const txt2 = store.addContentWithParent(new TextContent(''), cont1, { selected: true });
        const cont2 = store.addContentWithParent(ContainerContent.empty(''), cont1);
        const foldr1 = store.addContentWithParent(FolderContent.empty('', '', ''), cont2);
        store.setCurrentRoot(foldr1);
        const txt3 = store.addContent(new TextContent(''), { selected: true });
        const txt4 = store.addContent(new TextContent(''), { selected: true });
        store.setCurrentRoot(curRoot);

        expect(txt3.selected).toEqual(false);
        expect(txt4.selected).toEqual(false);

        store.setSelected(txt1, true);
        expect(txt1.selected).toBeTrue();
        expect(txt2.selected).toBeFalse();
        expect(txt3.selected).toBeFalse();
        expect(txt4.selected).toBeFalse();

        store.setSelected(cont1, true);
        expect(txt1.selected).toBeFalse();
        expect(txt2.selected).toBeFalse();
        expect(cont1.selected).toBeTrue();
        expect(txt3.selected).toBeFalse();
        expect(txt4.selected).toBeFalse();

        expect(store.getSelected()).toContain(cont1);
        expect(store.getSelected()).not.toContain(txt1);
        expect(store.getSelected()).not.toContain(txt2);
    });

    it('isRoot should be properly reset after a snapshot is loaded', () => {
        store.addSnapshotToHistory(false);
        const container1 = store.addContent(ContainerContent.empty(''));
        const obj1 = store.addContentWithParent(new TextContent(''), container1);
        store.addSnapshotToHistory(false);
        const container2 = store.addContent(ContainerContent.empty(''));
        const obj2 = store.addContentWithParent(new TextContent(''), container2);
        const arrow = store.addArrow(new ArrowContent(objectRef(container1), objectRef(container2), null, false, false));
        store.addSnapshotToHistory(false);
        store.undo();

        expect(store.getObject(container1.id)!.isRoot).toBeTrue();
        expect(store.getObject(obj1.id)!.isRoot).toBeFalse();
        expect(store.getObject(container2.id)).toBeFalsy();
        expect(store.getObject(obj2.id)).toBeFalsy();
    });

    it('undo and redo lol', () => {
        const obj1 = store.addContent(new TextContent('a'));
        store.addSnapshotToHistory(false);
        const obj2 = store.addContent(new TextContent('b'));
        store.addSnapshotToHistory(false);
        const obj3 = store.addContent(new TextContent('c'));
        store.addSnapshotToHistory(false);
        const obj4 = store.addContent(new TextContent('d'));
        store.addSnapshotToHistory(false);
        expect(store.getObject(obj1.id)).toBeTruthy();
        expect(store.getObject(obj2.id)).toBeTruthy();
        expect(store.getObject(obj3.id)).toBeTruthy();
        expect(store.getObject(obj4.id)).toBeTruthy();
        store.undo();
        expect(store.getObject(obj1.id)).toBeTruthy();
        expect(store.getObject(obj2.id)).toBeTruthy();
        expect(store.getObject(obj3.id)).toBeTruthy();
        expect(store.getObject(obj4.id)).toBeFalsy();
        store.undo();
        expect(store.getObject(obj1.id)).toBeTruthy();
        expect(store.getObject(obj2.id)).toBeTruthy();
        expect(store.getObject(obj3.id)).toBeFalsy();
        expect(store.getObject(obj4.id)).toBeFalsy();
        store.undo();
        expect(store.getObject(obj1.id)).toBeTruthy();
        expect(store.getObject(obj2.id)).toBeFalsy();
        expect(store.getObject(obj3.id)).toBeFalsy();
        expect(store.getObject(obj4.id)).toBeFalsy();
        expect(() => { store.undo(); }).toThrow();
        expect(store.getObject(obj1.id)).toBeTruthy();
        expect(store.getObject(obj2.id)).toBeFalsy();
        expect(store.getObject(obj3.id)).toBeFalsy();
        expect(store.getObject(obj4.id)).toBeFalsy();
        store.redo();
        store.redo();
        store.redo();
        expect(store.getObject(obj2.id)).toBeTruthy();
        expect(store.getObject(obj3.id)).toBeTruthy();
        expect(store.getObject(obj4.id)).toBeTruthy();
        store.undo();
        store.undo();
        expect(store.getObject(obj3.id)).toBeFalsy();
        expect(store.getObject(obj4.id)).toBeFalsy();
    });

    it('select and deselect, make sure they affect inner containers', () => {
        const c1 = store.addContent(ContainerContent.empty(''));
        const t1 = store.addContentWithParent(new TextContent(''), c1);
        const c2 = store.addContentWithParent(ContainerContent.empty(''), c1);
        const t2 = store.addContentWithParent(new TextContent(''), c2);

        store.setSelected(t1, true);
        store.setSelected(t2, true);

        expect(t1.selected).toBeTrue();
        expect(t2.selected).toBeTrue();

        store.setSelected(c1, true);
        expect(t1.selected).toBeFalse();
        expect(t2.selected).toBeFalse();
    });

    // locks up for some reason
    /*it('_getObjRootFolder', () => {
        const c1 = store.addContent(ContainerContent.empty(''));
        const t1 = store.addContentWithParent(new TextContent(''), c1);
        //expect(store['_getObjRootFolder'](t1)).toBe(store['_currentRoot']);
    });*/

    it('Adding content in a parent from another folder throws an error', () => {
        const c1 = store.addContent(ContainerContent.empty('c1'));
        const f1 = store.addContentWithParent(FolderContent.empty('f1', '', ''), c1);
        store.setCurrentRoot(f1);
        expect(() => store.addContentWithParent(new TextContent('t2'), c1)).toThrow();
    });

    it('_nodeVisitAll behaves', () => {
        store.setCurrentRoot(null);

        const c1 = store.addContent(ContainerContent.empty('c1'));
        const t1 = store.addContentWithParent(new TextContent('t1'), c1);
        const f1 = store.addContentWithParent(FolderContent.empty('f1', '', ''), c1);
        store.setCurrentRoot(f1);
        const c2 = store.addContent(ContainerContent.empty('c2'));
        const t2 = store.addContentWithParent(new TextContent('t2'), c2);

        expect(store['_nodeVisitAll'](store['_root'], false, (n) => { return n.id == c1.id })).toEqual(c1);
        expect(store['_nodeVisitAll'](store['_root'], false, (n) => { return n.id == t1.id })).toEqual(t1);
        expect(store['_nodeVisitAll'](store['_root'], false, (n) => { return n.id == f1.id })).toEqual(f1);
        expect(store['_nodeVisitAll'](store['_root'], false, (n) => { return n.id == c2.id })).toEqual(null);
        expect(store['_nodeVisitAll'](store['_root'], false, (n) => { return n.id == t2.id })).toEqual(null);
        
        expect(store['_nodeVisitAll'](store['_currentRoot'], false, (n) => { return n.id == c1.id })).toEqual(null);
        expect(store['_nodeVisitAll'](store['_currentRoot'], false, (n) => { return n.id == t1.id })).toEqual(null);
        expect(store['_nodeVisitAll'](store['_currentRoot'], false, (n) => { return n.id == f1.id })).toEqual(f1);
        expect(store['_nodeVisitAll'](store['_currentRoot'], false, (n) => { return n.id == c2.id })).toEqual(c2);
        expect(store['_nodeVisitAll'](store['_currentRoot'], false, (n) => { return n.id == t2.id })).toEqual(t2);

        expect(store['_nodeVisitAll'](store['_root'], true, (n) => { return n.id == c1.id })).toEqual(c1);
        expect(store['_nodeVisitAll'](store['_root'], true, (n) => { return n.id == t1.id })).toEqual(t1);
        expect(store['_nodeVisitAll'](store['_root'], true, (n) => { return n.id == f1.id })).toEqual(f1);
        expect(store['_nodeVisitAll'](store['_root'], true, (n) => { return n.id == c2.id })).toEqual(c2);
        expect(store['_nodeVisitAll'](store['_root'], true, (n) => { return n.id == t2.id })).toEqual(t2);
    });

    it('delete keeps consistency', () => {
        const c1 = store.addContent(ContainerContent.empty('c1'));
        const t1 = store.addContentWithParent(new TextContent('t1'), c1);
        const c2 = store.addContentWithParent(ContainerContent.empty('c2'), c1);
        const t2 = store.addContentWithParent(new TextContent('t1'), c2);
        const c3 = store.addContentWithParent(ContainerContent.empty('c2'), c2);
        const t3 = store.addContentWithParent(new TextContent('t1'), c3);
        const f1 = store.addContentWithParent(FolderContent.empty('f1', '', ''), c1);

        store.deleteObject(c1);

        expect(store.getObject(c1.id)).toEqual(null);
        expect(store.getObject(t1.id)).toEqual(null);
        expect(store.getObject(f1.id)).toEqual(null);
        expect(store.getObject(c2.id)).toEqual(null);
        expect(store.getObject(t2.id)).toEqual(null);
        expect(store.getObject(c3.id)).toEqual(null);
        expect(store.getObject(t3.id)).toEqual(null);
    });

    it('delete objects connected by arrows delete the arrows (start)', () => {
        const c1 = store.addContent(ContainerContent.empty('c1'));
        const c2 = store.addContent(ContainerContent.empty('c2'));
        const a1 = store.addArrow(new ArrowContent(objectRef(c1), objectRef(c2), null, false, false));

        store.deleteObject(c1);
        expect(store.getObject(c1.id)).toEqual(null);
        expect(store.getObject(a1.id)).toEqual(null);
    });

    it('delete objects connected by arrows delete the arrows (end)', () => {
        const c1 = store.addContent(ContainerContent.empty('c1'));
        const c2 = store.addContent(ContainerContent.empty('c2'));
        const a1 = store.addArrow(new ArrowContent(objectRef(c1), objectRef(c2), null, false, false));

        store.deleteObject(c2);
        expect(store.getObject(c2.id)).toEqual(null);
        expect(store.getObject(a1.id)).toEqual(null);
    });

    it('setParents keeps consistency', () => {
        const c1 = store.addContent(ContainerContent.empty('c1'));
        const t1 = store.addContentWithParent(new TextContent('t1'), c1);
        const c2 = store.addContentWithParent(ContainerContent.empty('c2'), c1);
        const t2 = store.addContentWithParent(new TextContent('t1'), c2);
        const c3 = store.addContentWithParent(ContainerContent.empty('c2'), c2);
        const t3 = store.addContentWithParent(new TextContent('t1'), c3);
        const f1 = store.addContentWithParent(FolderContent.empty('f1', '', ''), c1);

        store.setParents([t1], c2, 0);

        expect(c1.content.objects.findIndex(o => t1.id == o.id)).toEqual(-1);
        expect(c2.content.objects.findIndex(o => t1.id == o.id)).not.toEqual(-1);

        store.setParents([t1], c2, 1);
        expect(c2.content.objects.findIndex(o => t1.id == o.id)).not.toEqual(-1);

        store.setParents([t1], c2, 0);
        expect(c2.content.objects.findIndex(o => t1.id == o.id)).not.toEqual(-1);

        store.setParents([c3], null, 0);
    });

    it('cloning a folder should not add the children to all', () => {
        const f1 = store.addContent(FolderContent.empty('f1', '', ''));
        store.setCurrentRoot(f1);
        let t1 = store.addContent(new TextContent('t1'));
        let c1 = store.addContent(new TextContent('c1'));

        store.setCurrentRoot(null);

        expect(store['_all']).toEqual({
            0: store['_root'],
            1: curRoot,
        });

        store.setCurrentRoot(curRoot);

        expect(store['_all']).toEqual({
            1: curRoot,
            2: f1,
        });

        let f1Clone = store.cloneFolder(-1, f1.content, {});

        expect(store['_all']).toEqual({
            1: curRoot,
            2: f1,
            5: f1Clone,
        });
    });

});
