import {EventEmitter, Injectable, NgZone, OnInit} from "@angular/core";
import { DialogService } from "@ngneat/dialog";
import { getBoxToBoxArrow } from "curved-arrows";
import { BehaviorSubject, first, takeUntil, takeWhile } from "rxjs";
import { Size2, Vec2 } from "../common/math";
import { ClipboardService } from "../common/services/clipboard.service";
import { assertUnreachable } from "../common/types";
import { ObjectV1, ParserV1, V1 } from "../file-definition/file-v1";
import { GoogleDriveService } from "../storage/google-drive-service/google-drive.service";
import { StoragePopupComponent } from "../storage/storage-popup/storage-popup.component";
import { StorageService } from "../storage/storage.service";
import { AddContentOptions, CanvasObjectStore } from "./canvas-object.store";
import { ArrowContent, CanvasAddable, CanvasArrowTarget, CanvasContainer, CanvasContent, CanvasFolder, CanvasId, CanvasObject, CanvasObjectSerializable, ContainerContent, ContentSerializable, CurveInfo, FolderContent, ImageContent, isCanvasAddable, isCanvasContainer, objectRef, TextContent, TitleContent } from "./canvas.model";
import { TextAreaService } from "./component/text-area/text-area.service";
import { DragEvent } from "./directives/canvas-object.directive";


class UnacceptableError implements Error {
    name: string = 'unacceptable';

    constructor(public message: string, public stack?: string | undefined) {}
}


class Idle {
    kind = 'idle' as const;
}

class Cancelled {
    kind = 'cancelled' as const;
}

class Resizing {
    kind = 'resizing' as const;
}

class Dragging {
    kind = 'dragging' as const;

    constructor(public objects: CanvasObject[]) {}
}

class Undoing {
    kind = 'undoing' as const;
}

class JustDropped {
    kind = 'just-dropped' as const;

    constructor() {}
}

class DraggingArrowHandle {
    kind = 'dragging-arrow-handle' as const;

    constructor(
        public start: CanvasObject<CanvasArrowTarget>, 
        public curve: CurveInfo,
        public pos: Vec2,
        public size: Size2,
        public hovering: CanvasObject<CanvasArrowTarget>|null
        ) {}
}

class BoxSelecting {
    kind = 'box-selecting' as const;
}

type CanvasState = Idle|Resizing|Dragging|Undoing|BoxSelecting|DraggingArrowHandle|JustDropped|Cancelled;

const remap = (
    value:number,
    sourceMin:number,
    sourceMax:number,
    destMin = 0,
    destMax = 1,
  ) =>
    destMin +
    ((value - sourceMin) / (sourceMax - sourceMin)) *
      (destMax - destMin);

type SaveState = 'loaded'|'unsaved'|'saving'|'saved'|'save-error';

@Injectable({
    "providedIn": "root"
})
export class CanvasService implements OnInit {

    public offset: Vec2 = Vec2.z();
    public zoom: number = 1;
    public offset$: BehaviorSubject<Vec2> = new BehaviorSubject(this.offset.clone());
    public zoom$: BehaviorSubject<number> = new BehaviorSubject(this.zoom);
    public draggingArrowHandle$: BehaviorSubject<DraggingArrowHandle|null> = new BehaviorSubject(null as any);
    public saveState$: BehaviorSubject<SaveState> = new BehaviorSubject('loaded' as SaveState);
    public attemptingLogin$: EventEmitter<boolean> = new EventEmitter();
    public cancelLoginAttempt$ = new EventEmitter();

    private _state: CanvasState = new Idle();


    constructor(
        private _canvasStore: CanvasObjectStore, 
        private _storageService: StorageService, 
        private _driveService: GoogleDriveService, 
        private _clipboard: ClipboardService,
        private _textAreaService: TextAreaService,
        private _dialog: DialogService,
        private _ngZone: NgZone,
    ) {
        _storageService.error$.subscribe((e) => {
            if(e === 'save' || e === 'full') {
                this.saveState$.next('save-error');
            } else {
                
            }
        });
        
        _storageService.currentFile$.subscribe(async (file) => {
            if (!file) return;
            this.cancelLoginAttempt$.emit();

            this._canvasStore.reset();
            this.reset();

            const cont = (data: V1) => {
                if(ParserV1.hasVersion(data)) {
                    if(data.version === 1) {
                        let d = data.data;
                        if(!d) {
                            let root: CanvasObjectSerializable = {
                                id: 0,
                                position: Vec2.z(),
                                size: Size2.z(),
                                content: { name: 'Home', color: 'white', icon: '', objects: [], kind: 'folder'},
                                parentId: null,
                                isRoot: false,
                            }
                            this._canvasStore.loadFromObject(root);
                        } else {
                            const objectV1toModel = (objv1: ObjectV1): CanvasObjectSerializable => {
                                let content: ContentSerializable;
                                if(objv1.content.kind === 'text') {
                                    content = objv1.content;
                                } else if(objv1.content.kind === 'title') {
                                    content = objv1.content;
                                } else if(objv1.content.kind === 'arrow') {
                                    content = objv1.content;
                                } else if(objv1.content.kind === 'image') {
                                    content = objv1.content;
                                } else if(objv1.content.kind === 'container') {
                                    const objs = objv1.content.objects.map(o => objectV1toModel(o));
                                    content = {
                                        ...objv1.content,
                                        objects: objs
                                    };
                                } else if(objv1.content.kind === 'folder') {
                                    const objs = objv1.content.objects.map(o => objectV1toModel(o));
                                    content = {
                                        ...objv1.content,
                                        objects: objs
                                    };
                                } else {
                                    throw new Error(`invalid kind ${objv1.content}`);
                                }

                                let obj: CanvasObjectSerializable = {
                                    id: objv1.id,
                                    position: new Vec2(objv1.position.x, objv1.position.y),
                                    size: new Size2(objv1.size.w, objv1.size.h),
                                    content: content,
                                    parentId: objv1.parentId,
                                    isRoot: objv1.isRoot,
                                };
                                return obj;
                            };
                            let obj: CanvasObjectSerializable = objectV1toModel(d.data);

                            this._canvasStore.loadFromObject(obj);
                            this.setCurrentRoot(this._canvasStore['_root'], false, false);
                        }
                    } else {
                        throw new Error('unknown version');
                    }
                } else {
                    throw new Error('missing version');
                }

                this.addMomentToHistory();
                this.saveState$.next('loaded');
            };
            
            const data = await _storageService.getFileData(file);
            if(!data) {
                if(_storageService.error$.value === 'files') {
                    this.attemptingLogin$.emit(true);
                    _driveService.authenticated$.pipe(takeWhile(val => !val, true), takeUntil(this.cancelLoginAttempt$)).subscribe(async (auth)=>{
                        if(auth) {
                            const dataAttempt2 = await _storageService.getFileData(file);
                            if(!dataAttempt2) {
                                const dialogRef = this._dialog.open(
                                    StoragePopupComponent, { 
                                        size: 'storagePopup',
                                        enableClose: false,
                                        closeButton: false,
                                        //backdrop: false,
                                    }
                                );
                                _ngZone.run(() => {
                                    this.attemptingLogin$.emit(false);
                                });
                            } else {
                                _ngZone.run(() => {
                                    cont(dataAttempt2);
                                    this.attemptingLogin$.emit(false);
                                });
                            }
                        }
                    });
                } else {
                    const dialogRef = this._dialog.open(
                        StoragePopupComponent, { 
                            size: 'storagePopup',
                            enableClose: false,
                            closeButton: false,
                            //backdrop: false,
                        }
                    );
                }
                return
            } else {
                cont(data);
            }


            
        });
    }

    ngOnInit(): void {
        //this._canvasStore.addSnapshotToHistory();
    }

    reset() {
        this._state = new Idle();
        this.draggingArrowHandle$.next(null);
        this._viewportHistory = {};
    }

    toolbarDragStart(tool: string, mousePos: Vec2) {
        if (this._state.kind == 'idle') {
            if (tool == 'container') {
                let newSize = new Size2(15 * 22, 128);
                let vp = new Vec2(this.offset.x, this.offset.y);
                let newPos = new Vec2((mousePos.x / this.zoom) + vp.x - newSize.w / 2, (mousePos.y / this.zoom) + vp.y - newSize.h / 2);

                let container = this.addContent({ position: newPos, size: newSize }, ContainerContent.empty(''))!;

                let title = this.addContent({
                    size: new Size2(15 * 22 - 20, 128 - 20)
                },
                    new TitleContent('<h2 class="ql-align-center">Title</h2>'),
                    container
                )!;

                this.addContent({
                    size: new Size2(15 * 22 - 20, 128 - 20)
                },
                    new TextContent('<div><br></div>'),
                    container
                );

                this._canvasStore['_fixLayout'](container);
                this.objectDragStart(container, mousePos, false);
            } else if (tool == 'folder') {
                let newSize = new Size2(15 * 6, 15 * 7);
                let vp = new Vec2(this.offset.x, this.offset.y);
                let newPos = new Vec2((mousePos.x / this.zoom) + vp.x - newSize.w / 2, (mousePos.y / this.zoom) + vp.y - newSize.h / 2);

                let folder = this.addContent({ position: newPos, size: newSize }, FolderContent.empty('<h2 class="ql-align-center">Title</h2>', '#8bc34a', ''))!;

                this._canvasStore['_fixLayout'](folder);
                this.objectDragStart(folder, mousePos, false);
            } else if (tool == 'title') {
                let newSize = new Size2(15 * 22, 15 * 2);
                let vp = new Vec2(this.offset.x, this.offset.y);
                let newPos = new Vec2((mousePos.x / this.zoom) + vp.x - newSize.w / 2, (mousePos.y / this.zoom) + vp.y - newSize.h / 2);

                let title = this.addContent({ position: newPos, size: newSize },
                    new TitleContent('<h2 class="ql-align-center">Title</h2>'),
                )!;

                this.objectDragStart(title, mousePos, false);
            } else if (tool == 'text') {
                let newSize = new Size2(15 * 22, 15 * 2);
                let vp = new Vec2(this.offset.x, this.offset.y);
                let newPos = new Vec2((mousePos.x / this.zoom) + vp.x - newSize.w / 2, (mousePos.y / this.zoom) + vp.y - newSize.h / 2);

                let text = this.addContent({ position: newPos, size: newSize },
                    new TextContent('<div><br></div>'),
                )!;

                this.objectDragStart(text, mousePos, false);
            } else if (tool == 'image') {
                let newSize = new Size2(15 * 22, 15 * 22);
                let vp = new Vec2(this.offset.x, this.offset.y);
                let newPos = new Vec2((mousePos.x / this.zoom) + vp.x - newSize.w / 2, (mousePos.y / this.zoom) + vp.y - newSize.h / 2);

                let image = this.addContent({ position: newPos, size: newSize },
                    new ImageContent('', true),
                )!;

                this.objectDragStart(image, mousePos, false);
            }
        } else {
            throw new Error('[CanvasService::objectDragStart] invalid state for request '+this._state.kind);
        }
    }

    objectDragStart(obj: CanvasObject, mousePos: Vec2, setTentative: boolean) {
        if (this._state.kind == 'idle') {
            let toDrag: CanvasObject[] = []
            if(obj.selected) {
                toDrag = [...this._canvasStore.getSelected().filter(s => s.content.kind != 'arrow')];
            } else {
                let selected = this._canvasStore.getSelected();
                if(selected.length > 0) {
                    this._canvasStore.clearSelected();
                }
                toDrag = [obj];
            }
            toDrag.forEach(d => {
                d.dragging = true;
                if(setTentative) {
                    d.tentativePosition = d.position.clone();
                    d.tentativeSize = d.size.clone();
                }
                
                if(d.content.kind === 'folder' && !obj.isRoot) {
                    //let global = this._canvasStore.calculateGlobalPos(obj);
                    //d.position.x = remap(mousePos.x, global.x, global.x + d.size.w, 0, d.size.w);
                    //d.position.y = remap(mousePos.y, global.y, global.y + d.size.h, 0, 90);
                    d.size.w = 90;
                    d.size.h = 90;
                }
            });
            this._state = new Dragging(toDrag);
        } else {
            throw new Error('[CanvasService::objectDragStart] invalid state for request');
        }
    }

    objectDragMove(event: DragEvent) {
        if (this._state.kind === 'dragging') {
            const newCoord = new Vec2(event.coord!.x/this.zoom, event.coord!.y/this.zoom)
            this._canvasStore.setPositionDelta(this._state.objects, newCoord);
        } else if (this._state.kind === 'cancelled') {
            // it's ok
        } else {
            throw new Error('[CanvasService::objectDragMove] invalid state for request');
        }
    }

    objectDragEnd() {
        if (this._state.kind === 'dragging') {
            this._state.objects.forEach(o => {
                o.dragging = false;
                let pos = this._canvasStore.calculateGlobalPos(o);
                o.position = pos;
            });

            this._canvasStore.setParents(this._state.objects as CanvasObject<CanvasAddable>[], null, -1);

            this._state = new Idle();
            this.addMomentToHistory();
        } else if (this._state.kind === 'just-dropped' || this._state.kind === 'cancelled') {
            this._state = new Idle();
        } else {
            throw new Error('[CanvasService::objectDragEnd] invalid state for request');
        }
    }

    objectDrop(target: CanvasObject, index: number) {
        if (this._state.kind === 'dragging') {

            this._state.objects.forEach(o => {
                o.dragging = false;
                let changed = this._canvasStore['_fixLayout'](this._canvasStore['_getObjRoot'](o)??o);
                this._canvasStore['_fixArrows'](changed);
            });

            if(!isCanvasContainer(target)) throw new Error('');
            for(const o of this._state.objects) {
                if(!isCanvasAddable(o)) throw new Error('');
            }
            this._canvasStore.setParents(this._state.objects as CanvasObject<CanvasAddable>[], target, index);

            this._state = new JustDropped();
            this.addMomentToHistory();
        } else if(this._state.kind === 'cancelled') {
            //
        } else {
            throw new Error('[CanvasService::objectDrop] invalid state for request');
        }
    }

    static recalculateCurve(
        fromX: number, fromY: number, fromW: number, fromH: number,
        toX: number, toY: number,
    ): [CurveInfo, Vec2, Size2] {
        let curveParts = getBoxToBoxArrow(
            fromX, fromY, fromW, fromH,
            toX-5, toY-5, 10, 10, { padStart: 0, padEnd: 0 }
        );
        let [sx, sy, c1x, c1y, c2x, c2y, ex, ey, ae, as] = curveParts;
        let baseCurve = {
            sx: sx,
            sy: sy,
            c1x: c1x,
            c1y: c1y,
            c2x: c2x,
            c2y: c2y,
            ex: ex,
            ey: ey,
            ae: ae,
            as: as,
        };
        
        let [pos,size] = ArrowContent.getBoundingBox(baseCurve);

        let curve = {
            sx: sx - pos.x,
            sy: sy - pos.y,
            c1x: c1x - pos.x,
            c1y: c1y - pos.y,
            c2x: c2x - pos.x,
            c2y: c2y - pos.y,
            ex: ex - pos.x,
            ey: ey - pos.y,
            ae: ae,
            as: as,
        };

        return [curve, pos, size];
    }

    arrowHandleDragStart(mousePos: Vec2, obj: CanvasObject<CanvasArrowTarget>) {
        if(this._state.kind == 'idle') {
            
            let global = this._canvasStore.calculateGlobalPos(obj);

            let [curve,pos,size] = CanvasService.recalculateCurve(global.x, global.y, obj.size.w, obj.size.h, mousePos.x, mousePos.y);
            this._state = new DraggingArrowHandle(obj, curve, pos, size, null);
            this._canvasStore.clearEditing();
            this._canvasStore.clearSelected();

            this.draggingArrowHandle$.next(this._state);
        } else {
            throw new Error('[CanvasService::arrowHandleDragStart] invalid state for request');
        }
    }

    arrowHandleDragMove(event: DragEvent) {
        if(this._state.kind == 'dragging-arrow-handle') {
            let obj = this._state.start;
            let mousePos = event.relatedCoord!;
            let global = this._canvasStore.calculateGlobalPos(obj);
            let [curve,pos,size] = CanvasService.recalculateCurve(
                (global.x-this.offset.x)*this.zoom, 
                (global.y-this.offset.y)*this.zoom, 
                obj.size.w*this.zoom, 
                obj.size.h*this.zoom, 
                mousePos.x, 
                mousePos.y
            );
            this._state = new DraggingArrowHandle(obj, curve, pos, size, null);

            this.draggingArrowHandle$.next(this._state);
        } else if (this._state.kind === 'cancelled') {
            //
        } else {
            throw new Error('[CanvasService::arrowHandleDragStart] invalid state for request');
        }
    }

    arrowHandleDragEnd() {
        if(this._state.kind == 'dragging-arrow-handle') {
            this._state = new Idle();
            this.draggingArrowHandle$.next(null);
        } else if(this._state.kind == 'just-dropped' || this._state.kind === 'cancelled') {
            this._state = new Idle();
        } else {
            throw new Error('[CanvasService::arrowHandleDragEnd] invalid state for request');
        }
    }

    arrowHandleDrop(end: CanvasObject<CanvasArrowTarget>) {
        if(this._state.kind == 'dragging-arrow-handle') {
            let [curve, pos, size] = this._canvasStore.calculateCurveInfo(this._state.start, end, 0, 0);
            let content = new ArrowContent(objectRef(this._state.start), objectRef(end), curve, false, false);
            this._canvasStore.addArrow(content, {
                position: pos,
                size: size,
            });
            
            this._state = new JustDropped();
            this.addMomentToHistory();
            this.draggingArrowHandle$.next(null);
        } else if (this._state.kind === 'cancelled') {
            //
        } else {
            throw new Error('[CanvasService::arrowHandleDrop] invalid state for request');
        }
    }

    objectResizeStart(obj: CanvasObject) {
        if(this._state.kind == 'idle') {
            //if (obj.editing) return;
            obj.resizing = true;

            obj.tentativePosition = new Vec2(obj.position.x, obj.position.y);
            obj.tentativeSize = new Size2(obj.size.w, obj.size.h);

            this._state = new Resizing();
        } else {
            throw new Error('[CanvasService::objectResizeStart] invalid state for request');
        }
    }

    objectResizeMove(inputObj: CanvasObject, size: Size2, coord: Vec2) {
        size = new Size2(size.w / this.zoom, size.h / this.zoom);
        coord = new Vec2(coord.x / this.zoom, coord.y / this.zoom);

        const resizeObj = (obj: CanvasObject, sizeOnly: boolean = false) => {
            obj.size.w += size.w - coord.x;
            obj.size.h += size.h - coord.y;
            if(!sizeOnly) obj.position.x = obj.position.x + coord.x;
            if(!sizeOnly) obj.position.y = obj.position.y + coord.y;
            this._canvasStore['_fixArrows']([obj], false);
            if(obj.content.kind === 'container') {
                for(const c of obj.content.objects) {
                    resizeObj(c, true);
                }
            } else if(obj.content.kind === 'image' && obj.resizing && !obj.isRoot) {
                //we only fixLayout if the image itself is being resized, not just a parent, and only if we have a parent that needs fixing
                let p = this._canvasStore['_getObjRoot'](obj);
                this._canvasStore['_fixArrows'](this._canvasStore['_fixLayout'](p??obj));
            }
        };

        if(this._state.kind == 'resizing') {
            if (!inputObj.resizing) return;
            resizeObj(inputObj);

            //this._canvasStore['_fixArrows']([inputObj], false);
        } else {
            throw new Error(`[CanvasService::objectResizeMove] invalid state for request ${this._state.kind}`);
        }
    }

    objectResizeEnd(obj: CanvasObject) {
        if(this._state.kind == 'resizing') {
            if (!obj.resizing) return;
            obj.resizing = false;
            this._canvasStore['_fixArrows'](this._canvasStore['_fixLayout'](obj, undefined, true));
            this._canvasStore['_calculateAndEmitBounds'](this._canvasStore['_currentRoot']);
            this._state = new Idle();
            this.addMomentToHistory();
        } else {
            throw new Error(`[CanvasService::objectResizeEnd] invalid state for request ${this._state.kind}`);
        }
    }

    onTextInput(obj: CanvasObject<TextContent|TitleContent|FolderContent>, htmlText: string) {
        if (obj.content.kind === 'text' || obj.content.kind === 'title' || obj.content.kind === 'folder') {
            let o = this._canvasStore.getObject(obj.id);
            
            if(this._state.kind === 'idle') {
                this.saveState$.next('unsaved');
                /*if (o && o.content.kind == 'text') {
                    //o.content.text = htmlText;
                } else {
                    throw new Error('');
                }
                //this.addMomentToHistory();*/
            } else if (this._state.kind === 'undoing' || this._state.kind === 'dragging') {
                
                //
            } else { 
                throw new Error(`[onTextInput] invalid state for request ${this._state.kind}`);
            }
        } else {
            throw new Error('')
        }
    }

    select(inputObj: CanvasObject, keepSelection: boolean, forceState?: boolean) {
        if (this._state.kind == 'idle') {
            let obj = this._canvasStore.getObject(inputObj.id);
            if(!obj) throw new Error('');
            let newState = forceState == null ? !obj.selected : forceState;
            if(obj.editing) {
                newState = true;
            }
            this._canvasStore.clearEditing();
            //this._textAreaService.setCurrentEditor(null);
            if(!keepSelection) this._canvasStore.clearSelected();
            this._canvasStore.setSelected(obj, newState);
        } else {
            throw new Error('[CanvasService::select] invalid state for request');
        }
    }
    
    clearSelected() {
        if (this._state.kind == 'idle') {
            this._canvasStore.clearSelected();
        } else {
            throw new Error('[CanvasService::clearSelected] invalid state for request');
        }
    }

    edit(obj: CanvasObject) {
        if (this._state.kind == 'idle') {
            //this._canvasStore.clearEditing();
            this._canvasStore.clearSelected();
            this._canvasStore.setSelected(obj, true);
            this._canvasStore.setEditing(obj);
        } else {
            throw new Error('[CanvasService::edit] invalid state for request');
        }
    }

    clearEditing() {
        if (this._state.kind == 'idle') {
            this._canvasStore.clearEditing();
        } else {
            throw new Error('[CanvasService::clearEditing] invalid state for request');
        }
    }

    async save() {
        if(this._storageService.error$.value && (this._storageService.error$.value !== 'save' && this._storageService.error$.value !== 'full')) return;

        if(this._storageService.error$.value && this._storageService.error$.value === 'save') {
            if(!this._driveService.authenticated$.value) {
                //this.saveState$.next('save-error');
                return;
            }
        }

        if(this.saveState$.value === 'saving') return;

        this.saveState$.next('saving');

        let snap = this._canvasStore.createSnapshoter();
        await this._storageService.saveDataForCurrent(snap);

        function delay(ms: number): Promise<void> {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        let assets = this._storageService.getAssets();
        await delay(200);
        let promises = [];
        for(const a of assets) {
            if(this._storageService.getImageRefCount(a.id) === 0) {
                promises.push(this._storageService.deleteIfNoRefsLeft(a));
            } else {
                promises.push(this._storageService.commitImage(a.id));
            }
        }

        await Promise.all(promises).then(() => {
            if(this.saveState$.value === 'saving') {
                this.saveState$.next('saved');
            }
        });

    }

    load() {

    }

    addContent<T extends CanvasAddable>(options: AddContentOptions, content: T, parent: CanvasContainer|null = null): CanvasObject<T>|null {
        if (this._state.kind == 'idle') {
            if(parent) {
                return this._canvasStore.addContentWithParent(content, parent, options);
            } else {
                return this._canvasStore.addContent(content, options);
            }
        } else {
            throw new Error('[CanvasService::addContent] invalid state for request');
        }
    }

    cloneFolder(options: AddContentOptions, oldId: CanvasId, content: FolderContent, parent: CanvasContainer|null = null): CanvasObject<FolderContent>|null {
        if (this._state.kind == 'idle') {
            let newFolder = this._canvasStore.cloneFolder(oldId, content, options, parent);
            if(!newFolder) return null;
            this._canvasStore['_nodeVisitAll'](newFolder, true, (obj) => {
                if(obj.content.kind === 'image') {
                    if(obj.content.handle != '') {
                        this._storageService.moveImageRefCount(obj.content.handle, +1);
                    }
                }
                return false;
            })

            return newFolder;
        } else {
            throw new Error('[CanvasService::addContent] invalid state for request');
        }
    }

    delete(object: CanvasObject): number[] {
        if (this._state.kind == 'idle' || this._state.kind === 'cancelled') {
            this._canvasStore['_nodeVisitAll'](object, true, (obj)=>{
                if(obj.content.kind === 'image' && obj.content.handle != '') {
                    this._storageService.moveImageRefCount(obj.content.handle, -1);
                }
                return false;
            });
            return this._canvasStore.deleteObject(object);
        } else {
            throw new Error('[CanvasService::remove] invalid state for request');
        }
    }

    private _viewportHistory: Record<number, Vec2> = {};

    private _readNextBoundsUpdate(root: CanvasObject|null) {
        this._canvasStore.bounds$.pipe(first()).subscribe((val) => {
            if((root && root.id in this._viewportHistory)) {
                this.broadcastViewportOffset(this._viewportHistory[root.id].clone());
            } else if (!root && this._canvasStore['_root'].id in this._viewportHistory) {
                this.broadcastViewportOffset(this._viewportHistory[this._canvasStore['_root'].id].clone());
            } else {
                if(val) {
                    const menuWidth = 90;
                    const menuHeight = 45;
                    let idealCenter = new Vec2(val[0].x+val[1].w/2-menuWidth/2, val[0].y+val[1].h/2+menuHeight/2);
                    this.broadcastViewportOffset(
                        new Vec2(
                            Math.round(idealCenter.x-window.screen.availWidth/2), 
                            Math.round(idealCenter.y-window.screen.availHeight/2)
                        )
                    );
                }
            }
        });
    }

    setCurrentRoot(root: CanvasFolder|null, addToHistory: boolean, trivialChange: boolean) {
        if(this._state.kind == 'idle') {

            this._canvasStore.setCurrentRoot(root); //this line must be called before the bound$ subscription bellow
            this._readNextBoundsUpdate(root);

            if(addToHistory) {
                this.addMomentToHistory(trivialChange);
            }
        } else {
            throw new Error('');
        }
    }

    setViewportOffset(newOffset: Vec2) {
        if(this._state.kind === 'idle' || this._state.kind === 'dragging' || this._state.kind === 'undoing') {
            this.offset = newOffset;
            //this.offset$.next(this.offset);

            this._viewportHistory[this._canvasStore['_currentRoot'].id] = this.offset.clone();
            //else this._viewportHistory[this._canvasStore['_root'].id] = this.offset.clone();
        } else {
            throw new Error('[CanvasService::setViewportOffset] invalid state for request ' + this._state.kind);
        }
    }

    broadcastViewportOffset(newOffset: Vec2) {
        if(this._state.kind === 'idle' || this._state.kind === 'undoing') {
            this.offset = newOffset;
            this.offset$.next(this.offset);
        } else {
            throw new Error('[CanvasService::setViewportOffset] invalid state for request ' + this._state.kind);
        }
    }

    setViewportZoom(newZoom: number) {
        if(this._state.kind == 'idle') {
            this.zoom = newZoom;
            //this.zoom$.next(this.zoom);
        } else {
            throw new Error('[CanvasService::setViewportZoom] invalid state for request');
        }
    }

    addMomentToHistory(trivialChange: boolean = false) {
        if(this._state.kind == 'idle' || this._state.kind === 'just-dropped') {
            this._canvasStore.addSnapshotToHistory(trivialChange);
            this._storageService.addRefCountToHistory();
            if(!trivialChange) {
                this.saveState$.next('unsaved');
            }
        } else {
            throw new Error('[CanvasService::addMomentToHistory] invalid state for request' + this._state.kind);
        }
    }

    setHeight(obj: CanvasObject, h: number) {
        if(this._state.kind == 'resizing' || this._state.kind == 'dragging' || this._state.kind == 'idle') {
            this._canvasStore.setHeight(obj, h);
        } else {
            throw new Error('[CanvasService::setHeight] invalid state for request');
        }
    }

    undo() {
        if(this._state.kind === 'idle') {
            this._state = new Undoing();
            try {
                let canvasUndo = this._canvasStore.undo();
                if(canvasUndo[0]) {
                    this._readNextBoundsUpdate(this._canvasStore['_currentRoot']);
                }
                this._storageService.undo();
                if(!canvasUndo[1]) {
                    this.saveState$.next('unsaved');
                }
            } finally {
                this._state = new Idle();
            }
        } else {
            throw new Error('invalid state for undo ' + this._state.kind);
        }
    }

    redo() {
        if(this._state.kind === 'idle') {
            let canvasRedo = this._canvasStore.redo();
            if(canvasRedo[0]) {
                this._readNextBoundsUpdate(this._canvasStore['_currentRoot']);
            }
            this._storageService.redo();
            if(!canvasRedo[1]) {
                this.saveState$.next('unsaved');
            }
        } else {
            throw new Error('invalid state for redo ' + this._state.kind);
        }
    }

    async copySelected(event: any) {
        if (!this._storageService.currentFile$.value) return;
        
        const createHTMLTree = (root: CanvasObject, global: Vec2|null): [string, string] => {
            return [root.toHtmlText(global, this._storageService), root.toText()];
        };

        if (this._canvasStore.getEditing()) return;

        event.preventDefault();

        let allToCopy = this._canvasStore.getSelected();

        let finalHtml = '<div data-slate-kind="multiple">\n';
        let finalPlain = '';
        for (const toCopy of allToCopy) {
            let global: Vec2|null = null;
            if(!toCopy.isRoot) {
                global = this._canvasStore.calculateGlobalPos(toCopy);
            }
            let [html, plain] = createHTMLTree(toCopy, global);
            finalHtml += html;
            finalPlain += plain;
        }
        finalHtml += '</div>'
        await this._clipboard.copyText(finalPlain, finalHtml);
    }

    async paste(event: any, shift: boolean) {
        if (!this._storageService.currentFile$.value) return;

        if (this._canvasStore.getEditing()) return;

        event.preventDefault();

        let pasteResult = await this._clipboard.paste(event);

        if (pasteResult.image) {
            let imageRef = this._storageService.createImage(pasteResult.image.data);

            this.clearSelected();
            this.addContent(
                { position: new Vec2(this.offset.x + 300, this.offset.y + 300), size: pasteResult.image.size },
                new ImageContent(imageRef.id, true)
            );
            //this._canvasStore.addSnapshotToHistory();
            //this._storageService.addRefCountingToHistory();
            this.addMomentToHistory();
        } else if (pasteResult.text && (!pasteResult.html || shift)) {
            this.clearSelected();
            this.addContent(
                { position: new Vec2(this.offset.x + 300, this.offset.y + 300), size: new Size2(15 * 22, 15 * 3) },
                new TextContent(pasteResult.text.replace(/\n/g, '<br>'))
            );
            //this.canvasStore.addSnapshotToHistory();
            //this._storageService.addRefCountingToHistory();
            this.addMomentToHistory();
        } else if (pasteResult.html) {
            this.clearSelected();
            let doc = new DOMParser().parseFromString(pasteResult.html, 'text/html');
            let firstChild = doc.body.firstChild as Element;

            try {
                if (firstChild) {
                    let kind = firstChild.getAttribute('data-slate-kind');
                    if (kind && kind == 'multiple') {
                        let allArrowTargets: Record<number, CanvasObject<CanvasArrowTarget>> = {};
                        for (let idx = 0; idx < firstChild.children.length; idx++) {
                            try {
                                let child = firstChild.children[idx];
                                let obj = CanvasObject.deserialize(CanvasObject.htmlToSerializable(child, this._storageService));
                                let parents: Record<number,CanvasContainer|undefined> = {};
                                let arrowsForLater: CanvasObject<ArrowContent>[] = [];
                                this._canvasStore['_nodeVisitAll'](obj, false, (o) => {
                                    if(o.content.kind === 'container') {
                                        let newCont;
                                        if(!o.isRoot && parents[o.parentId!] != undefined) {
                                            newCont = this.addContent(
                                                { position: new Vec2(o.position.x, o.position.y), size: new Size2(o.size.w, o.size.h), selected: false },
                                                ContainerContent.empty(o.content.title),
                                                parents[o.parentId!]!,
                                            );
                                        } else {
                                            newCont = this.addContent(
                                                { position: new Vec2(o.position.x, o.position.y), size: new Size2(o.size.w, o.size.h), selected: true },
                                                ContainerContent.empty(o.content.title),
                                            );
                                        }
                                        if(!newCont) throw new Error('');
                                        parents[o.id] = newCont;
                                        allArrowTargets[o.id] = newCont;
                                    } else if(o.content.kind === 'text') {
                                        let newText;
                                        if(!o.isRoot && parents[o.parentId!] != undefined) {
                                            newText = this.addContent(
                                                { position: new Vec2(o.position.x, o.position.y), size: new Size2(o.size.w, o.size.h), selected: false },
                                                o.content,
                                                parents[o.parentId!]!,
                                            );
                                        } else {
                                            newText = this.addContent(
                                                { position: new Vec2(o.position.x, o.position.y), size: new Size2(o.size.w, o.size.h), selected: true },
                                                o.content,
                                            );
                                        }
                                        if(!newText) throw new Error('');
                                        allArrowTargets[o.id] = newText;
                                    } else if(o.content.kind === 'title') {
                                        let newTitle;
                                        if(!o.isRoot && parents[o.parentId!] != undefined) {
                                            newTitle = this.addContent(
                                                { position: new Vec2(o.position.x, o.position.y), size: new Size2(o.size.w, o.size.h), selected: false },
                                                o.content,
                                                parents[o.parentId!]!,
                                            );
                                        } else {
                                            newTitle = this.addContent(
                                                { position: new Vec2(o.position.x, o.position.y), size: new Size2(o.size.w, o.size.h), selected: true },
                                                o.content,
                                            );
                                        }
                                        if(!newTitle) throw new Error('');
                                        allArrowTargets[o.id] = newTitle;
                                    } else if(o.content.kind === 'image') {
                                        let newImage;
                                        if(!o.isRoot && parents[o.parentId!] != undefined) {
                                            newImage = this.addContent(
                                                { position: new Vec2(o.position.x, o.position.y), size: new Size2(o.size.w, o.size.h), selected: false },
                                                o.content,
                                                parents[o.parentId!]!,
                                            );
                                        } else {
                                            newImage = this.addContent(
                                                { position: new Vec2(o.position.x, o.position.y), size: new Size2(o.size.w, o.size.h), selected: true },
                                                o.content,
                                            );
                                        }
                                        if(!newImage) throw new Error('');
                                        allArrowTargets[o.id] = newImage;
                                        //this._storageService.moveImageRefCount(newImage.content.handle, +1);
                                    } else if(o.content.kind === 'folder') {
                                        let newFolder;
                                        if(!o.isRoot && parents[o.parentId!] != undefined) {
                                            newFolder = this.cloneFolder({ 
                                                    position: new Vec2(o.position.x, o.position.y), 
                                                    size: new Size2(o.size.w, o.size.h), 
                                                    selected: false 
                                                },
                                                o.id,
                                                o.content, 
                                                parents[o.parentId!] 
                                            );
                                        } else {
                                            newFolder = this.cloneFolder({ 
                                                position: new Vec2(o.position.x, o.position.y), 
                                                size: new Size2(o.size.w, o.size.h), 
                                                selected: true 
                                            },
                                            o.id,
                                            o.content, 
                                        );
                                        }
                                        if(!newFolder) throw new Error('');
                                        allArrowTargets[o.id] = newFolder;
                                    } else if(o.content.kind === 'arrow') {
                                        arrowsForLater.push(o as CanvasObject<ArrowContent>);
                                    } else {
                                        assertUnreachable(o.content);
                                    }
                                    return false;
                                }, obj.content.kind === 'folder');

                                arrowsForLater.forEach((o) => {
                                    if(o.content.start.kind !== 'id' || o.content.end.kind !== 'id') {
                                        throw new Error('');
                                    }
                                    let startId = o.content.start.id;
                                    let endId = o.content.end.id;
                                    let start = allArrowTargets[startId];
                                    let end = allArrowTargets[endId];

                                    if(!start || !end) {
                                        console.warn('arrow parents not found');
                                    } else {
                                        this._canvasStore.addArrow(
                                            new ArrowContent(
                                                objectRef(start), 
                                                objectRef(end), 
                                                o.content.curve, 
                                                o.content.tipLeft, 
                                                o.content.tipRight
                                            ), 
                                            {
                                                position: new Vec2(o.position.x, o.position.y), 
                                                size: new Size2(o.size.w, o.size.h), 
                                                selected: true
                                            }
                                        );
                                    }
                                })
                            } catch(e) {
                                if(e instanceof Error) {
                                    throw new UnacceptableError(e.message, e.stack);
                                }
                            }
                        }
                    } else {
                        if(kind) throw new UnacceptableError('data-slate-kind is not multiple');
                        throw new Error('');
                    }
                } else {
                    throw new Error('');
                }
            }
            catch (e) {
                if(e instanceof UnacceptableError) {
                    throw (e);
                } else {
                    this.addContent(
                        { position: new Vec2(this.offset.x + 300, this.offset.y + 300), size: new Size2(15 * 22, 15 * 3) },
                        new TextContent(pasteResult.html)
                    );
                }
            }

            this.addMomentToHistory();
        }
    }

    cancel() {
        if(this._state.kind === 'dragging') {
            let objs = this._state.objects;
            this._state = new Cancelled();
            objs.forEach((o) => { 
                o.dragging = false;

                if(!o.tentativePosition || !o.tentativeSize) {
                    this.delete(o);
                } else {
                    o.position = o.tentativePosition;
                    o.size = o.tentativeSize;
                    this._canvasStore['_nodeVisitAll'](o, false, (o2) => {
                        this._canvasStore['_fixArrows']([o2]);
                        return false;
                    });
                }
            });

        } else if(this._state.kind === 'dragging-arrow-handle') {
            this._canvasStore.setSelected(this._state.start, true);
            this._state = new Cancelled();
            this.draggingArrowHandle$.next(null);
        } else if(this._state.kind === 'idle') {
            if(this._canvasStore.getEditing()) {
                this._canvasStore.clearEditing();
            } else if(this._canvasStore.getSelected().length > 0) {
                this._canvasStore.clearSelected();
            }
        }
    }
}