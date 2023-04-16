import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { HistoryList } from "../common/history-list";
import { Size2, Vec2 } from "../common/math";
import { CanvasContent, CanvasFolder, CanvasObject, FolderContent, isCanvasParent, isCanvasFolder, CanvasId, objectRef, CanvasObjectSerializable, isCanvasContainer, CanvasContainer, CanvasAddable, isCanvasAddable, ArrowContent, isCanvasArrowTarget, CurveInfo, CanvasArrowTarget, CanvasParent, idRef } from "./canvas.model";

export const UNIT = 15;
export const DEFAULT_INSERTION_POSITION = Vec2.z();
export const DEFAULT_INSERTION_SIZE = Size2.z();
export const DEFAULT_HOME_COLOR = 'white';
export const DEFAULT_HOME_NAME = 'Home';
export const DEFAULT_STARTING_ID = 0;
export const HISTORY_SIZE = 1000;

export type AddContentOptions = Partial<{ position: Vec2, size: Size2, selected: boolean }>;
export type StoreSerializable = { 
    lastObjectId: CanvasId, 
    data: CanvasObjectSerializable,
    currentRootId: CanvasId|null,
    trivial: boolean,
};

const DEFAULT_ROOT: CanvasFolder = new CanvasObject(0, new Vec2(0, 0), new Size2(0, 0), new FolderContent(DEFAULT_HOME_NAME, DEFAULT_HOME_COLOR, '', []), null, false);

@Injectable({
    "providedIn": "root"
})
export class CanvasObjectStore {
    private _lastObjectId = DEFAULT_STARTING_ID;
    private _root: CanvasFolder = DEFAULT_ROOT.unsafeClone();
    private _currentRoot: CanvasFolder = this._root;

    private _all: Record<CanvasId, CanvasObject | null> = {};
    private _selected: CanvasObject[] = [];
    private _editing: CanvasObject | null = null;

    private _history: HistoryList<StoreSerializable> = new HistoryList(HISTORY_SIZE);

    currentRoot$: BehaviorSubject<CanvasFolder> = new BehaviorSubject(this._currentRoot);
    currentPath$: BehaviorSubject<CanvasFolder[]> = new BehaviorSubject([] as any);

    editing$: BehaviorSubject<CanvasObject | null> = new BehaviorSubject(null as any);
    selected$: BehaviorSubject<CanvasObject[]> = new BehaviorSubject([] as any);

    bounds$: BehaviorSubject<[Vec2, Size2] | null> = new BehaviorSubject(null as any);

    constructor() {

    }

    private _nextObjectId(): number {
        return ++this._lastObjectId;
    }

    // Turns a T:CanvasContent into a CanvasObject<T>. This functions clones its inputs. The output has a valid ID that can be inserted into
    // the tree. The parentId parameter is always set to null.
    private _contentToObjectShallow<T extends CanvasContent>(content: T, position?: Vec2, size?: Size2, selected?: boolean, isRoot?: boolean): CanvasObject<T> {
        return new CanvasObject<T>(
            this._nextObjectId(),
            (position ?? DEFAULT_INSERTION_POSITION).clone(),
            (size ?? DEFAULT_INSERTION_SIZE).clone(),
            content.shallowClone() as T, // pinky promise
            null,
            !!isRoot,
            false,
            false,
            false,
            selected,
        );
    }

    // we visit a folder if it is the root node of this search or if enterFolders is true.
    // if the visitor returns true, the search is interrupted
    private _nodeVisitAll(node: CanvasObject, enterFolders: boolean, visitor: (obj: CanvasObject) => boolean, shallow: boolean = false): CanvasObject | null {
        let stack = [node];
        while (true) {
            let cur = stack.shift();
            if (!cur) break;

            if (visitor(cur) || shallow) return cur;

            if (cur.content.kind == 'container') {
                stack.push(...cur.content.objects);
            } else if (cur.content.kind == 'folder') {
                if (cur == node || enterFolders) {
                    stack.push(...cur.content.objects);
                }
            }
        }
        return null;
    }

    private _reloadAll() {
        this._all = {};
        this._nodeVisitAll(this._currentRoot, false, (obj) => {
            this._all[obj.id] = obj;
            return false;
        });
    }

    private _reloadAuxiliary() {
        this._selected = [];

        this._nodeVisitAll(this._currentRoot, false, (obj) => {
            if (obj.selected) {
                this._selected.push(obj);
            }
            if (obj.content.kind == 'arrow') {
                if (obj.content.start.kind == 'id') {
                    let startObj = this._all[obj.content.start.id];
                    if (!startObj) {
                        throw new Error('[CanvasObjectStore::_reloadAuxiliary] could not find object to upgrade start ref');
                    }
                    if (!isCanvasArrowTarget(startObj)) {
                        throw new Error('[CanvasObjectStore::_reloadAuxiliary] arrow start is not an arrow target')
                    }
                    obj.content.start = objectRef(startObj);
                }
                if (obj.content.end.kind == 'id') {
                    let endObj = this._all[obj.content.end.id];
                    if (!endObj) {
                        throw new Error('[CanvasObjectStore::_reloadAuxiliary] could not find object to upgrade end ref');
                    }
                    if (!isCanvasArrowTarget(endObj)) {
                        throw new Error('[CanvasObjectStore::_reloadAuxiliary] arrow end is not an arrow target')
                    }
                    obj.content.end = objectRef(endObj);
                }
            }
            return false;
        });

        this.selected$.next(this._selected);
    }

    private _serializeStore(trivialChange: boolean): StoreSerializable {
        let serializedRoot = {
            lastObjectId: this._lastObjectId,
            data: this._root.getSerializable(),
            currentRootId: this._currentRoot.id,
            trivial: trivialChange,
        };
        return serializedRoot;
    }

    // searches the entire tree
    // unused and also couldn't test it without crashing
    /*private _getObjRootFolder(obj: CanvasObject): CanvasFolder {
        let current: CanvasObject | null = obj;
        while (current) {
            let next = this._nodeVisitAll(this._root, true, (p) => {
                return p.id == obj.parentId;
            });
            if (next && isCanvasFolder(next)) {
                return next;
            }
            current = next;
        }
        throw new Error(`[CanvasObjectStore::_getObjRootFolder] cannot get root folder for this object (is this the root itself?)`);
    }*/

    // returns the entire lineage of the object, not including the original obj 
    // only searches the current root
    private _getObjLineage(obj: CanvasObject): CanvasObject[] {
        let current: CanvasObject | null = obj;
        let result: CanvasObject[] = [];
        while (current) {
            //result.push(current);
            if (current.parentId === null) break;
            let next: CanvasObject | null = this._all[current.parentId];
            if (!next) throw new Error(`${current.parentId}+${next}+${Object.keys(this._all)}`);
            if (next && isCanvasFolder(next)) {
                break;
            }
            result.push(next);
            current = next;
        }
        return result;
    }

    //only searches the current root, doesn't chase folders
    private _getObjRoot(obj: CanvasObject): CanvasObject | null {
        let lineage = this._getObjLineage(obj);
        return lineage[lineage.length - 1] ?? null;
    }

    private _createObjectFromContentTree<T extends CanvasContent>(
        oldId: CanvasId,
        content: T, 
        parent: CanvasParent | null,
        options?: AddContentOptions,
        oldIds: Record<CanvasId, CanvasObject> = {},
        arrows: CanvasObject[] = [],
    ): [
        [CanvasId,CanvasObject<T>],[CanvasId,CanvasObject][]
    ] {
        let ret = this._createObjectFromContentTree2(oldId, content, parent, options, oldIds, arrows);

        arrows.forEach(arrow => {
            if(arrow.content.kind !== 'arrow') throw new Error('');

            let parent = oldIds[arrow.parentId!];
            if(parent.content.kind === 'folder') {

                let oldStart = arrow.content.start;
                let oldEnd = arrow.content.end;

                let oldStartId;
                let oldEndId;

                if(oldStart.kind === 'object') {
                    oldStartId = oldStart.object.id;
                } else {
                    oldStartId = oldStart.id;
                }
                if(oldEnd.kind === 'object') {
                    oldEndId = oldEnd.object.id;
                } else {
                    oldEndId = oldEnd.id;
                }

                arrow.content.start = idRef(oldIds[oldStartId].id);
                arrow.content.end = idRef(oldIds[oldEndId].id);
                arrow.parentId = parent.id;
                parent.content.objects.push(arrow);
            }
        });

        return ret;
    };

    private _createObjectFromContentTree2<T extends CanvasContent>(
        oldId: CanvasId,
        content: T, 
        parent: CanvasParent | null,
        options: AddContentOptions|undefined,
        oldIds: Record<CanvasId, CanvasObject>,
        arrows: CanvasObject[],
    ): [
        [CanvasId,CanvasObject<T>],[CanvasId,CanvasObject][]
    ] {
        let obj = this._contentToObjectShallow(content, options?.position, options?.size, options?.selected, !parent||parent.content.kind==='folder');
        let objChildren = [];

        
        if (this._nodeVisitAll(this._root, true, (o) => {
            return o.id == obj.id;
        })) {
            throw new Error(`[CanvasObjectStore::addContentWithParent] object id is already registered`);
        }

        oldIds[oldId] = obj;

        let actualParent;
        if (parent) {
            actualParent = parent;
            obj.parentId = parent.id;
            if (isCanvasAddable(obj)) {
                actualParent.content.objects.push(obj);
            } else if(isCanvasFolder(actualParent)) {
                oldIds[actualParent.id] = actualParent;
                arrows.push(obj);
            } else {
                throw new Error(`[CanvasObjectStore::addContentWithParent] '${obj.content.kind}' kind cannot have parents`);
            }
        } else {
            actualParent = this._currentRoot;
            obj.parentId = actualParent.id;
            actualParent.content.objects.push(obj);
        }

        if (isCanvasParent(obj)) {
            let children = obj.content.objects;
            obj.content.objects = [];
            for (const child of children) {
                let newTree = this._createObjectFromContentTree2(child.id, child.content, obj, {
                    position: child.position,
                    size: child.size,
                    selected: false,
                }, oldIds, arrows);

                objChildren.push(newTree[0], ...newTree[1])
            }
        }

        return [[oldId, obj], objChildren as [CanvasId,CanvasObject][]]; 
    }

    private _addNewlyCreatedObjectToInternalStructures(obj: CanvasObject) {
        this._all[obj.id] = obj;

        if (obj.selected) {
            if (this._selected.findIndex(s => s.id == obj.id) != -1) {
                throw new Error('[CanvasObjectStore::addContentWithParent] object is already in selected list');
            }
            this._selected.push(obj);
            this.selected$.next(this._selected);
        }
    }

    private _addContentWithMaybeParent<T extends CanvasContent>(
        content: T, 
        parent: CanvasParent | null,
        options?: AddContentOptions
    ): CanvasObject<T> {
        let obj = this._createObjectFromContentTree(-1, content, parent, options);
        
        this._addNewlyCreatedObjectToInternalStructures(obj[0][1]);
        obj[1].forEach(o => {this._addNewlyCreatedObjectToInternalStructures(o[1])});

        this._calculateAndEmitBounds(this._currentRoot);
        return obj[0][1];
    }

    reset() {
        this._lastObjectId = DEFAULT_STARTING_ID;
        this._root = DEFAULT_ROOT.unsafeClone();
        this._currentRoot = this._root;
        this._all = {};
        this._selected = [];
        this._editing = null;
        this._history = new HistoryList(HISTORY_SIZE);

        this._reloadAll();
        this._reloadAuxiliary();

        this.currentRoot$.next(this._currentRoot);

        this.selected$.next([]);
        this.editing$.next(null);
    }

    private _calculateAndEmitFolderPath(obj: CanvasFolder) {
        let current: CanvasObject | null = obj;
        let result: CanvasFolder[] = [obj];
        while (current) {
            //result.push(current);
            if (current.parentId === null) break;
            let next: CanvasObject | null = this._nodeVisitAll(this._root, true, (o) => o.id == current!.parentId);
            if (!next) throw new Error(`${current.parentId}+${next}+${Object.keys(this._all)}`);
            if (next && isCanvasFolder(next)) {
                //break;
                result.push(next);
            }
            current = next;
        }
        result.reverse();
        this.currentPath$.next(result);
    }

    private _calculateAndEmitBounds(obj: CanvasFolder) {
        let positionsAndSizes: { position: Vec2, size: Size2 }[] = [];

        this._nodeVisitAll(obj, false, (o) => {
            if (o.id != obj.id && o.isRoot) { // ignore the parent folder
                positionsAndSizes.push({
                    position: o.position.clone(),
                    size: o.size.clone(),
                });
            }
            return false;
        });

        let res;

        if (positionsAndSizes.length === 0) {
            positionsAndSizes = [
                { position: new Vec2(-1000, -1000), size: new Size2(2000, 2000) }
            ];
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const element of positionsAndSizes) {
            const { position, size } = element;

            if (position.x < minX) {
                minX = position.x;
            }

            if (position.y < minY) {
                minY = position.y;
            }

            if (position.x + size.w > maxX) {
                maxX = position.x + size.w;
            }

            if (position.y + size.h > maxY) {
                maxY = position.y + size.h;
            }
        }

        res = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
        };

        const border = 200;
        this.bounds$.next([new Vec2(res.x - border, res.y - border), new Size2(res.width + border * 2, res.height + border * 2)]);
    }

    setCurrentRoot(newRoot: CanvasFolder | null) {
        if (!newRoot) newRoot = this._root;
        let newerRoot = this._nodeVisitAll(this._root, true, (obj) => {
            return obj.id == newRoot!.id;
        });
        if (!newerRoot || !isCanvasFolder(newerRoot)) {
            throw new Error('[CanvasStoreObject::setCurrentRoot] root is not on the main tree');
        }

        this.clearSelected();
        this.clearEditing();
        this._currentRoot = newerRoot;
        this._reloadAll();
        this._reloadAuxiliary();

        this.currentRoot$.next(this._currentRoot);
        this._calculateAndEmitFolderPath(newerRoot);
        this._calculateAndEmitBounds(newerRoot);
    }

    getObject(id: CanvasId): CanvasObject | null {
        return this._all[id] ?? null;
    }

    getEditing(): CanvasObject | null {
        return this._editing;
    }

    setEditing(inputObj: CanvasObject) {
        let obj = this._all[inputObj.id];
        if (!obj) throw new Error('');
        this.clearEditing();
        obj.editing = true;
        this._editing = obj;
        this.editing$.next(this._editing);
    }

    clearEditing() {
        if (this._editing) {
            this._editing.editing = false;
            this._editing = null;
            this.editing$.next(null);
        }
    }

    getSelected(): CanvasObject[] {
        return this._selected.slice();
    }

    // deselects every child of obj recursively, and every parent
    setSelected(inputObj: CanvasObject, selected: boolean) {

        const _setSelected = (inputObj: CanvasObject, selected: boolean) => {
            let obj = this._all[inputObj.id];
            if (!obj) {
                throw new Error('[CanvasObjectStore::setSelected] cant select object that does not exist');
            }

            //if(obj.selected == selected) return;

            obj.selected = selected;
            if (selected) {
                if (this._selected.findIndex(s => s.id == obj!.id) != -1) {
                    //throw new Error('[CanvasObjectStore::setSelected] object is already in selected list');
                    return;
                }
                this._selected.push(obj);

                if (isCanvasContainer(obj)) {
                    obj.content.objects.forEach((o) => _setSelected(o, false));
                }
            } else {
                let index = this._selected.findIndex(s => s.id == obj!.id);
                if (isCanvasContainer(obj)) {
                    obj.content.objects.forEach((o) => _setSelected(o, false));
                }
                if (index != -1) {
                    this._selected.splice(index, 1);
                } else {
                    //throw new Error('[CanvasObjectStore::setSelected] selected object was not in the list');
                    return;
                }
            }
        }
        _setSelected(inputObj, selected);

        if (selected) {
            let lineage = this._getObjLineage(inputObj);
            for (const ancestor of lineage) {
                if (ancestor.selected) {
                    ancestor.selected = false;
                    let index = this._selected.findIndex(s => s.id == ancestor.id);
                    if (index != -1) {
                        this._selected.splice(index, 1);
                    } else {
                        throw new Error('[CanvasObjectStore::setSelected] selected object was not in the list');
                    }
                }
            }
        }

        this._reloadAll();
        this._reloadAuxiliary();
        this.currentRoot$.next(this._currentRoot);
    }

    clearSelected() {
        for (const s of this._selected) {
            s.selected = false;
        }
        this._selected = [];
        this.selected$.next([]);
    }

    createSnapshot(): string {
        return JSON.stringify(this._serializeStore(false), null, 4);
    }

    createSnapshoter(): StoreSerializable {
        return this._serializeStore(false);
    }

    loadSnapshot(input: string) {
        let deserialized = JSON.parse(input);

        if (
            ('data' in deserialized && deserialized['data'] != undefined) &&
            ('lastObjectId' in deserialized && deserialized['lastObjectId'] != undefined)
        ) {
            let newRoot;
            try {
                newRoot = CanvasObject.deserialize(deserialized.data);
                if (!isCanvasFolder(newRoot)) {
                    throw Error(`[CanvasObjectStore::_loadSnapshot] error deserializing snapshot, root is not folder`);
                }
            } catch (e) {
                throw Error(`[CanvasObjectStore::_loadSnapshot] error deserializing snapshot: ${e}`);
            }

            this._root = newRoot;
            this._lastObjectId = deserialized.lastObjectId;
            this.setCurrentRoot(this._root);
        } else {
            throw Error(`[CanvasObjectStore::_loadSnapshot] input is not valid snapshot: ${input}`)
        }
    }

    loadFromObject(rootObj: CanvasObjectSerializable) {
        const root = CanvasObject.deserialize(rootObj);

        if (!isCanvasFolder(root)) throw new Error('');
        this._root = root;
        let max = 0;
        this._nodeVisitAll(root, true, (obj) => {
            max = Math.max(obj.id, max);
            return false;
        })
        this._lastObjectId = max;
        this.setCurrentRoot(root);

    }

    addSnapshotToHistory(trivialChange: boolean) {
        let snap = this._serializeStore(trivialChange);
        this._history.next(snap);
    }

    redo(): [boolean, boolean] {
        let oldRoot = this._currentRoot;

        this._history.redo();

        let newRoot;
        try {
            newRoot = CanvasObject.deserialize(this._history.get().data);
            if (!isCanvasFolder(newRoot)) {
                throw Error(`[CanvasObjectStore::_loadSnapshot] error deserializing snapshot, root is not folder`);
            }
        } catch (e) {
            throw Error(`[CanvasObjectStore::_loadSnapshot] error deserializing snapshot: ${e}`);
        }

        this._root = newRoot;
        this._lastObjectId = this._history.get().lastObjectId;

        let currentRootId = this._history.get().currentRootId;
        let trivial = this._history.get().trivial;
        let newRootSet = currentRootId != oldRoot.id;

        this._nodeVisitAll(this._root, true, (obj) => {
            if(obj.id == currentRootId && isCanvasFolder(obj)) {
                this.setCurrentRoot(obj);
                return true;
            }
            return false;
        });

        return [newRootSet, trivial];
    }

    undo(): [boolean, boolean] {
        let oldRoot = this._currentRoot;
        let oldHistory = this._history.get();

        this._history.undo();

        let newRoot;
        try {
            newRoot = CanvasObject.deserialize(this._history.get().data);
            if (!isCanvasFolder(newRoot)) {
                throw Error(`[CanvasObjectStore::_loadSnapshot] error deserializing snapshot, root is not folder`);
            }
        } catch (e) {
            throw Error(`[CanvasObjectStore::_loadSnapshot] error deserializing snapshot: ${e}`);
        }

        this._root = newRoot;
        this._lastObjectId = this._history.get().lastObjectId;
        let currentRootId = this._history.get().currentRootId;
        let newRootSet = currentRootId != oldRoot.id;
        let trivial = oldHistory.trivial;

        this._nodeVisitAll(this._root, true, (obj) => {
            if(obj.id == currentRootId && isCanvasFolder(obj)) {
                this.setCurrentRoot(obj);
                return true;
            }
            return false;
        });

        return [newRootSet, trivial];
    }

    addArrow(content: ArrowContent, options?: AddContentOptions) {
        return this._addContentWithMaybeParent(content, null, options);
    }

    addContentWithParent<T extends CanvasAddable>(content: T, parent: CanvasContainer, options?: AddContentOptions): CanvasObject<T> {
        if (!this._all[parent.id]) throw new Error('[CanvasObjectStore::addContentWithParent] parent not in current root');
        return this._addContentWithMaybeParent(content, parent, options);
    }

    // Creates a new CanvasObject from a CanvasContent object. Input content remains untouched.
    addContent<T extends CanvasAddable>(content: T, options?: AddContentOptions): CanvasObject<T> {
        return this._addContentWithMaybeParent(content, null, options);
    }

    cloneFolder(oldId: CanvasId, content: FolderContent, options?: AddContentOptions, parent: CanvasContainer | null = null): CanvasObject<FolderContent> | null {
        let ret = this._createObjectFromContentTree(oldId, content, parent, options);

        this._addNewlyCreatedObjectToInternalStructures(ret[0][1]);

        this._calculateAndEmitBounds(this._currentRoot);

        return ret[0][1];
    }

    private _deleteObject(inputObj: CanvasObject): number[] {
        let deleted: number[] = [];
        let obj = this._all[inputObj.id];
        if (!obj) throw new Error('could not find object: ' + JSON.stringify(inputObj));

        let toDelete: CanvasObject[] = [];
        this._nodeVisitAll(obj, false, (o: CanvasObject) => {
            toDelete.push(o);
            if (o.selected) {
                this.setSelected(o, false);
            }
            if (o.editing) {
                this.clearEditing();
            }
            return false;
        });

        let toFix: CanvasObject[] = [];

        for (const d of toDelete) {
            if (d.parentId === null) throw new Error('trying to delete the root');
            let parent = this._all[d.parentId];
            if (!parent) {
                if (toDelete.findIndex(x => x.id == d.parentId) == -1) throw new Error('');
                //delete this._all[d.id];
                continue;
            }
            if (!isCanvasParent(parent)) throw new Error('');

            if (parent.id != this._currentRoot.id) {
                toFix.push(parent);
            }

            let idx = parent.content.objects.findIndex(o => o.id == d.id);
            if (idx == -1) throw new Error('');
            parent.content.objects.splice(idx, 1);

            //delete this._all[d.id];
            deleted.push(d.id);
        }

        let arrowsToDelete = [];
        for (const a of Object.values(this._all)) {
            if (!a || a.content.kind != 'arrow') continue;

            let start = a.content.start;
            let end = a.content.end;

            if (start.kind != 'object' || end.kind != 'object') throw new Error('');

            let startDeleted = toDelete.findIndex(d => d.id == (start as any).object.id) != -1;
            let endDeleted = toDelete.findIndex(d => d.id == (end as any).object.id) != -1;

            if (startDeleted || endDeleted) {
                arrowsToDelete.push(a);
            }
        }

        arrowsToDelete.forEach((a) => {
            deleted.push(...this._deleteObject(a));
        });

        toFix.forEach((o) => {
            if (toDelete.findIndex(x => x.id == o.id) != -1) return;
            this._fixArrows(this._fixLayout(this._getObjRoot(o) ?? o), false);
        });

        return deleted;
    }

    deleteObject(inputObj: CanvasObject): number[] {
        let ret = this._deleteObject(inputObj);

        this._reloadAll();
        this._reloadAuxiliary();
        this.currentRoot$.next(this._currentRoot);

        return ret;
    }

    setParents(objects: CanvasObject<CanvasAddable>[], newParent: CanvasContainer | null, initialIndex: number) {
        let newParentObj;
        if (newParent == null) {
            newParentObj = this._currentRoot;
        } else {
            newParentObj = this._all[newParent.id];
        }
        if (!newParentObj || !isCanvasParent(newParentObj)) throw new Error('');

        if (initialIndex == -1) {
            initialIndex = newParentObj.content.objects.length;
        }

        let oldParents: CanvasObject[] = [];
        let fixLater: CanvasObject[] = [];

        let idx = 0;
        for (let objIdx = 0; objIdx < objects.length; objIdx++) {
            const obj = this._all[objects[objIdx].id];

            if (!obj) throw new Error('');
            if (!isCanvasAddable(obj)) throw new Error('');

            if (obj.parentId === null) throw new Error('');

            if (obj.parentId != newParentObj.id) {
                let oldParent;
                if (obj.parentId == this._currentRoot.id) {
                    oldParent = this._currentRoot;
                } else {
                    oldParent = this._all[obj.parentId];
                }

                if (!oldParent) throw new Error('');
                if (!isCanvasParent(oldParent)) throw new Error('');

                newParentObj.content.objects.splice(initialIndex + idx, 0, obj);

                const index = oldParent.content.objects.findIndex(o => o.id == obj.id);
                oldParent.content.objects.splice(index, 1);

                obj.isRoot = !newParent;
                obj.parentId = newParentObj.id;

                if (oldParent.id != this._currentRoot.id) {
                    oldParents.push(oldParent);
                }
            } else {
                // if the object is already a child of newParent
                // we need to remove it from it's current position and insert it again in the desired position
                const currentIndex = newParentObj.content.objects.findIndex(o => o.id === obj.id);
                newParentObj.content.objects.splice(currentIndex, 1);

                if (currentIndex < initialIndex + idx) {
                    idx--;
                    newParentObj.content.objects.splice(initialIndex + idx, 0, obj);
                } else {
                    newParentObj.content.objects.splice(initialIndex + idx, 0, obj);
                }
            }
            idx++;
            if (obj.isRoot) {
                this._fixArrows(this._fixLayout(obj), true);
            }
        }

        if (newParent) {
            this._fixArrows(this._fixLayout(this._getObjRoot(newParentObj) ?? newParentObj), true);
        }
        for (let oldParent of oldParents) {
            this._fixArrows(this._fixLayout(this._getObjRoot(oldParent) ?? oldParent), true);
        }

        this._reloadAll();
        this._reloadAuxiliary();
        this.currentRoot$.next(this._currentRoot);

        this._calculateAndEmitBounds(this._currentRoot);
    }

    setPositionDelta(objects: CanvasObject<CanvasContent>[], delta: Vec2) {
        let changed: CanvasObject[] = [];
        for (const obj of objects) {
            obj.position.x += delta.x;
            obj.position.y += delta.y;

            this._nodeVisitAll(obj, false, (o) => {
                changed.push(o);
                return false;
            });
        }
        this._fixArrows(changed);
        //this._calculateAndEmitBounds(this._currentRoot);
    }

    setHeight(inputObj: CanvasObject, height: number) {
        let obj = this._all[inputObj.id];
        if (!obj) throw new Error('[CanvasObjectStore::setHeight] invalid input object');

        if (obj.size.h != height) {
            obj.size.h = height;
            let root = this._getObjRoot(obj) ?? obj;
            let changed = this._fixLayout(root, false, false);
            this._fixArrows(changed);
            this._calculateAndEmitBounds(this._currentRoot);
        }
    }

    setSize(inputObj: CanvasObject, size: Size2) {
        let obj = this._all[inputObj.id];
        if (!obj) throw new Error('[CanvasObjectStore::setSize] invalid input object');
        obj.size.w = size.w;
        obj.size.h = size.h;

        let root = this._getObjRoot(obj) ?? obj;
        let changed = this._fixLayout(root);
        this._fixArrows(changed);
        this._calculateAndEmitBounds(this._currentRoot);
    }

    calculateGlobalPos(obj: CanvasObject): Vec2 {
        return this._getObjLineage(obj).map(o => o.position).reduce((prev, cur) => {
            return new Vec2(prev.x + cur.x, prev.y + cur.y);
        }, obj.position.clone());
    }

    calculateCurveInfo(start: CanvasObject<CanvasArrowTarget>, end: CanvasObject<CanvasArrowTarget>, padStart: number, padEnd: number): [CurveInfo, Vec2, Size2] {
        let startGlobalPos = this.calculateGlobalPos(start);
        let endGlobalPos = this.calculateGlobalPos(end);

        let [curve, pos, size] = ArrowContent.recalculateCurve(
            startGlobalPos.x, startGlobalPos.y, start.size.w, start.size.h,
            endGlobalPos.x, endGlobalPos.y, end.size.w, end.size.h,
            padStart, padEnd
        );

        return [curve, pos, size]
    }

    private _fixArrows(changed: CanvasObject[], bringForward: boolean = false): CanvasObject[] {
        let arrowsChanged: CanvasObject[] = [];
        for (const obj of this._currentRoot.content.objects) {
            if (obj.content.kind == 'arrow') {
                let refStart = obj.content.start;
                let refEnd = obj.content.end;

                if (refStart.kind == 'id' || refEnd.kind == 'id') throw new Error('');

                let start = this._all[refStart.object.id];
                let end = this._all[refEnd.object.id];
                if (!start || !end || !isCanvasArrowTarget(start) || !isCanvasArrowTarget(end)) throw new Error('');

                obj.content.start = objectRef(start);
                obj.content.end = objectRef(end);

                let startChanged = changed.findIndex(c => c.id == start!.id);
                let endChanged = changed.findIndex(c => c.id == end!.id);
                if (startChanged != -1 || endChanged != -1) {
                    let [curve, pos, size] = this.calculateCurveInfo(start, end, obj.content.tipLeft ? 6 : 0, obj.content.tipRight ? 6 : 0);
                    obj.content.curve = curve;
                    obj.position = pos;
                    obj.size = size;
                    arrowsChanged.push(obj);
                }
            }
        }
        if (bringForward) {
            for (const a of arrowsChanged) {
                let idx = this._currentRoot.content.objects.findIndex(o => o.id == a.id);
                if (idx != -1) {
                    this._currentRoot.content.objects.splice(idx, 1);
                } else {
                    throw new Error('');
                }
                this._currentRoot.content.objects.push(a);
            }
        } else {
            //this._reloadAll();
            //this._reloadAuxiliary();
            //this.currentRoot$.next(this._currentRoot);
        }
        return arrowsChanged;
    }

    private _fixLayoutUnsafe(obj: CanvasObject, childrenOnly: boolean = false, roundValues: boolean = true): CanvasObject[] {
        let objectsTouched = [];
        objectsTouched.push(obj);
        if (obj.isRoot && !childrenOnly && roundValues) {
            obj.position.x = 15 * Math.round(obj.position.x / 15);
            obj.position.y = 15 * Math.round(obj.position.y / 15);
            obj.size.w = 15 * Math.round(obj.size.w / 15);
            //if(obj.content.kind != 'container' && obj.content.kind != 'text' && obj.content.kind != 'title' && obj.content.kind != 'folder') {
            if (obj.content.kind === 'image') {
                obj.size.h = 15 * Math.round(obj.size.h / 15);
            }
        }
        if (obj.content.kind == 'folder') {
            if (obj.isRoot) {
                obj.size.w = 180;
                //obj.size.h = 90;
            }
        }
        if (obj.content.kind == 'container') {
            obj.size.h = 15;
            for (const containerChild of obj.content.objects) {
                containerChild.position.x = 10;
                containerChild.position.y = obj.size.h;
                containerChild.size.w = obj.size.w - 22;
                objectsTouched.push(...this._fixLayoutUnsafe(containerChild));
                if (!childrenOnly) obj.size.h += containerChild.size.h + 10;
            }
            //if(!childrenOnly) obj.size.h += 15;
            obj.size.h += 10
            //if(!childrenOnly) obj.size.h = 15 * Math.round(obj.size.h / 15);
            if (roundValues) {
                //obj.size.h = 15 * Math.round(obj.size.h / 15);
            }
        }

        return objectsTouched;
    }

    private _fixLayout(inputObj: CanvasObject, childrenOnly: boolean = false, roundValues: boolean = true): CanvasObject[] {
        let obj = this._all[inputObj.id];
        if (!obj) throw new Error('[CanvasObjectStore::_fixLayout] invalid input object');
        return this._fixLayoutUnsafe(obj, childrenOnly, roundValues);
    }

}