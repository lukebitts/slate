import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { DialogService } from '@ngneat/dialog';
import { BehaviorSubject, first, Observable } from 'rxjs';
import { Size2, Vec2 } from 'src/app/common/math';
import { GoogleDriveService } from 'src/app/storage/google-drive-service/google-drive.service';
import { StoragePopupComponent } from 'src/app/storage/storage-popup/storage-popup.component';
import { StorageService } from 'src/app/storage/storage.service';
import { CanvasObjectStore } from '../../canvas-object.store';
import { CanvasObject, isCanvasArrowTarget, isCanvasFolder, isCanvasText, isCanvasTitle, TextContent } from '../../canvas.model';
import { CanvasService } from '../../canvas.service';
import { DragEvent } from '../../directives/canvas-object.directive';
import { TextAreaService } from '../text-area/text-area.service';


@Component({
    selector: 'app-canvas',
    templateUrl: './canvas.component.html',
    styleUrls: ['./canvas.component.scss']
})
export class CanvasComponent implements OnInit {

    @Input() loading: boolean = false;
    @Input() canCancelLoad: boolean = false;
    
    @Output() onLoadingCancel: EventEmitter<void> = new EventEmitter();

    Infinity = Infinity;

    setBold$: EventEmitter<boolean> = new EventEmitter();
    setItalic$: EventEmitter<boolean> = new EventEmitter();
    useWheelScroll$: EventEmitter<boolean> = new EventEmitter();

    forceZoom$: BehaviorSubject<number> = new BehaviorSubject(1);

    private _keyboard = {
        shift: false,
        ctrl: false,
    };

    constructor(
        public canvasService: CanvasService,
        public canvasStore: CanvasObjectStore,
        public driveService: GoogleDriveService,
        private _storageService: StorageService,
        private _textAreaService: TextAreaService,
        private _dialog: DialogService,
    ) { }

    onLogoClick() {
        const dialogRef = this._dialog.open(
            StoragePopupComponent, {
            size: 'storagePopup',
            enableClose: true,
            closeButton: true,
            //backdrop: false,
        }
        );
    }

    async onStorageClick() {
        
    }

    onZoomClick(direction: number) {
        let dirY = (direction < 0) ? -1 : (direction > 0 ? 1 : 0);
        let zoom = Math.max((1 / 3) * 1, Math.min((1 / 3) * 8, this.canvasService.zoom - dirY * (1 / 3)));
        this.forceZoom$.next(zoom);
    }

    async onSaveClick() {
        await this.canvasService.save();
    }

    onToolbarDragStart(event: DragEvent, tool: string) {
        this.canvasService.toolbarDragStart(tool, event.coord!);
    }

    onToolbarDragMove(event: DragEvent) {
        this.canvasService.objectDragMove(event);
    }

    onToolbarDragEnd(event: DragEvent) {
        this.canvasService.objectDragEnd();
    }

    onObjectDragStart(event: DragEvent, obj: CanvasObject) {
        this.canvasService.objectDragStart(obj, event.coord!, true);
    }

    onObjectDragMove(event: DragEvent) {
        this.canvasService.objectDragMove(event);
    }

    onObjectDragEnd(event: DragEvent) {
        this.canvasService.objectDragEnd();
    }

    onObjectDrop(target: CanvasObject, index: number) {
        this.canvasService.objectDrop(target, index);
    }

    onObjectTap(event: MouseEvent|PointerEvent|{originalEvent:PointerEvent}, obj: CanvasObject) {
        if('originalEvent' in event) {
            if(event.originalEvent.which != 1) return;
        } else {
            if(event.which != 1) return;
        }

        this.canvasService.select(obj, this._keyboard.shift);

        // since the tap event prevent propagation by default, we have to force
        // a blur on text/title elements.
        window.getSelection()!.removeAllRanges(); 
    }

    onTextClick(inputObj: CanvasObject, event: any) {
        if(event.originalEvent.button != 0) return;
        let obj = this.canvasStore.getObject(inputObj.id);
        if (!obj) throw new Error('');
        if (obj.content.kind === 'text' || obj.content.kind === 'title' || obj.content.kind === 'folder') {
            if (this._keyboard.shift) {
                this.canvasService.select(obj, true);
            } else {
                if (obj.editing) return;
                this.canvasService.select(obj, false);
                this.canvasService.edit(obj);

                window.setTimeout(() => {
                    let editor = event.interactable.target.querySelector('#editor');
                    editor.querySelector('.ql-editor').focus();

                    const selection = document.getSelection();
                    let range;
                    if('caretRangeFromPoint' in document) {
                        range = document.caretRangeFromPoint(event.clientX, event.clientY);
                        if (selection && range) {
                            selection.setBaseAndExtent(
                                range.startContainer,
                                range.startOffset,
                                range.startContainer,
                                range.startOffset,
                            );
                        }
                    } else if ('caretPositionFromPoint' in document) {
                        range = (document as any).caretPositionFromPoint(event.clientX, event.clientY);
                        if (selection && range) {
                            selection.setBaseAndExtent(
                                range.offsetNode,
                                range.offset,
                                range.offsetNode,
                                range.offset,
                            );
                        }
                    } else {
                        throw new Error('could not focus on the user\'s click');
                        return;
                    }
                }, 0);
            }
        } else {
            throw new Error('');
        }
    }

    onTextFocus(obj: CanvasObject) {
        if (obj.content.kind == 'text' || obj.content.kind === 'title' || obj.content.kind === 'folder') {
            this.canvasService.edit(obj);
        } else {
            throw new Error('');
        }
    }

    onTextBlur(obj: CanvasObject, evt: any) {
        
    }

    onTextBlurAndChange(obj: CanvasObject) {
        if (obj.content.kind === 'text' || obj.content.kind === 'title' || obj.content.kind === 'folder') {
            this.canvasService.addMomentToHistory();
            //this.canvasService.clearEditing(obj);
        } else {
            throw new Error('');
        }
    }

    onTextInput(obj: CanvasObject, htmlText: string) {
        if (!isCanvasText(obj) && !isCanvasTitle(obj) && !isCanvasFolder(obj)) throw new Error('');
        this.canvasService.onTextInput(obj, htmlText);
    }

    onArrowHandleDragStart(evt: DragEvent, obj: CanvasObject) {
        if (!isCanvasArrowTarget(obj)) throw new Error('');
        this.canvasService.arrowHandleDragStart(evt.coord!, obj);
    }

    onArrowHandleDragMove(evt: DragEvent) {
        this.canvasService.arrowHandleDragMove(evt);
    }

    onArrowHandleDragEnd(evt: DragEvent) {
        this.canvasService.arrowHandleDragEnd();
    }

    onArrowHandleDrop(obj: CanvasObject) {
        if (!isCanvasArrowTarget(obj)) throw new Error('');
        this.canvasService.arrowHandleDrop(obj);
    }

    onBoxSelect(event: any) {
        if(this.canvasService['_state'].kind === 'cancelled') return;

        this.canvasService.clearEditing();
        if (!this._keyboard.shift) {
            this.canvasService.clearSelected();
        }
        event.currentTarget.selectedTargets.forEach((el: any) => {
            let id = parseInt(el.getAttribute('data-obj-id'));
            if (isNaN(id)) {
                throw new Error('');
            } else {
                let obj = this.canvasStore.getObject(id);

                if (obj) {
                    this.canvasService.select(obj, true, true);
                    obj.editing = false;
                } else {
                    console.error(el);
                    throw new Error('selected something that doesnt exist');
                }
            }
        });
    }

    onBoxSelectEnd(event: any) {
        if (event.currentTarget.selectedTargets.length == 0) {
            if(this.canvasService['_state'].kind === 'cancelled') return;

            this.canvasService.clearSelected();
            this.canvasService.clearEditing();
            window.getSelection()?.empty();
        }
    }

    onObjectResizeStart(event: DragEvent) {
        this.canvasService.objectResizeStart(event.target);
    }

    onObjectResizeMove(event: DragEvent) {
        this.canvasService.objectResizeMove(event.target, event.relatedSize!, event.coord!);
    }

    onObjectResizeEnd(event: DragEvent) {
        this.canvasService.objectResizeEnd(event.target);
    }

    onFolderDoubleClick(obj: CanvasObject) {
        if (!isCanvasFolder(obj)) throw new Error('');
        this.canvasService.setCurrentRoot(obj, true, true);
    }

    async onUploadClick(obj: CanvasObject, file: any) {
        if (obj.content.kind !== 'image') throw new Error('');

        let image: any = await new Promise((resolve1, reject1) => {
            var input = file.target;
            var reader = new FileReader();
            reader.onload = async () => {
                var dataURL = reader.result as string;
                await new Promise((resolve2, reject2) => {
                    let img = new Image();
                    img.src = dataURL;

                    const imageMimeRgx = /data:image\/(.*?);base64,/;
                    let imageMimeResult = imageMimeRgx.exec(dataURL);
                    if(!imageMimeResult) return reject2();

                    img.onload = () => {
                        resolve2(img);
                    }
                }).then((img: any) => {
                    let image = {
                        data: dataURL,
                        size: new Size2(img.naturalWidth, img.naturalHeight),
                    }
                    let imageRef = this._storageService.createImage(image.data);

                    if (obj.content.kind !== 'image') throw new Error('');

                    obj.content.handle = imageRef.id;
                    obj.content.isNew = true;
                    obj.size = image.size;

                    this.canvasService.addMomentToHistory();
                    resolve1(image);
                }).catch(() => {
                    console.warn('invalid image to upload');
                });
            };
            reader.readAsDataURL(input.files[0]);
        });

        
    }

    ngOnInit(): void {
    }

    onViewportOffset(evt: Vec2) {
        this.canvasService.setViewportOffset(evt);
    }

    onViewportZoom(evt: number) {
        this.canvasService.setViewportZoom(evt);
        //this.zoomers$.next(evt);
    }

    trackById(_idx: number, obj: CanvasObject): number {
        return obj && obj.id;
    }

    @HostListener('click', ['$event'])
    onClick(event: any) {

    }

    onResize(newSize: Size2, obj: CanvasObject) {
        let extraHeight = 0;
        if (!obj.isRoot) {
            if (obj.content.kind === 'text') {
                extraHeight = 30;
            } else if (obj.content.kind === 'title') {
                extraHeight = 10;
            } else if (obj.content.kind === 'folder') {
                extraHeight = 120;
            } else {
                throw new Error(obj.content.kind);
            }
        } else {
            if (obj.content.kind === 'text') {
                extraHeight = 30;
            } else if (obj.content.kind === 'title') {
                extraHeight = 10;
            } else if (obj.content.kind === 'folder') {
                extraHeight = 120;
            } else {
                throw new Error(obj.content.kind);
            }
        }
        this.canvasService.setHeight(obj, newSize.h + extraHeight);
    }

    @HostListener('wheel', ['$event'])
    onWheel(event: any) {

        this._keyboard.ctrl = event.ctrlKey;
        this._keyboard.shift = event.shiftKey;

        if (event.ctrlKey) {
            //let dirX = (event.deltaX < 0) ? -1 : (event.deltaX > 0 ? 1 : 0);
            let dirY = (event.deltaY < 0) ? -1 : (event.deltaY > 0 ? 1 : 0);
            let zoom = Math.max((1 / 3) * 1, Math.min((1 / 3) * 8, this.canvasService.zoom - dirY * (1 / 3)));
            this.forceZoom$.next(zoom);
        }
    }

    private _scrolling = false;

    @HostListener('window:keydown', ['$event'])
    onKeydown(event: KeyboardEvent) {
        
        this._keyboard.ctrl = event.ctrlKey;
        this._keyboard.shift = event.shiftKey;

        if (event.key == 'Control') {
            this._keyboard.ctrl = true;
            this.useWheelScroll$.emit(false);
        } else if (event.key == 'z' || event.key == 'Z') {
            if (event.ctrlKey) {
                if (this.canvasStore.getEditing()) {
                    return;
                }
                if (event.shiftKey) {
                    this.canvasService.redo();
                } else {
                    this.canvasService.undo();
                }
                event.preventDefault();
            }
        } else if (event.key == 'Shift') {
            this._keyboard.shift = true;
        } else if (event.key == 'Delete') {
            if (this.canvasStore.getEditing()) return;
            let sel = this.canvasStore.getSelected();
            let deleted = [];
            for (const s of sel) {
                if(deleted.indexOf(s.id) === -1) {
                    deleted.push(...this.canvasService.delete(s));
                }
                if(deleted.indexOf(s.id) === -1) {
                    throw new Error('');
                }
            }
            this.canvasService.addMomentToHistory();
        } else if (event.key == 'Escape') {
            this.canvasService.cancel();
        }
    }

    @HostListener('window:keyup', ['$event'])
    onKeyup(event: KeyboardEvent) {

        this._keyboard.ctrl = event.ctrlKey;
        this._keyboard.shift = event.shiftKey;

        if (event.key == 'Control') {
            this._keyboard.ctrl = false;
            this.useWheelScroll$.emit(true);
        } else if (event.key == 'Shift') {
            this._keyboard.shift = false;
        }
    }

    @HostListener('mousemove', ['$event'])
    onMouseMove(event: MouseEvent) {
        
        this._keyboard.ctrl = event.ctrlKey;
        this._keyboard.shift = event.shiftKey;

        if (this._scrolling != false) {
            let zoom = this.canvasService.zoom;
            let offset = this.canvasService.offset;
            this.canvasService.broadcastViewportOffset(new Vec2(Math.round(offset.x - event.movementX / zoom), Math.round(offset.y - event.movementY / zoom)));
        }
    }

    @HostListener('mouseup', ['$event'])
    onMouseUp(event: MouseEvent) {
        if (event.which === 2) {
            this._scrolling = false;
            event.preventDefault();
            event.stopPropagation();
        }
    }

    @HostListener('window:mousedown', ['$event'])
    onMouseDown(event: MouseEvent) {
        if (event.which === 2) {
            this._scrolling = true;
            event.preventDefault();
            event.stopPropagation();
        }
    }

    @HostListener('window:copy', ['$event'])
    async onCopy(event: any) {
        this.canvasService.copySelected(event);
    }

    @HostListener('window:paste', ['$event'])
    async onPaste(event: any) {
        await this.canvasService.paste(event, this._keyboard.shift);
    }
}
