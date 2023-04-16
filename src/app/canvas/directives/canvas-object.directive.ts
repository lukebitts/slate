import { Directive, ElementRef, EventEmitter, HostListener, Input, NgZone, OnDestroy, OnInit, Output } from '@angular/core';
import { ResizeSensor } from 'css-element-queries';
import { Interactable } from '@interactjs/types';
import interact from 'interactjs';
import { Size2, Vec2 } from 'src/app/common/math';
import { StorageService } from 'src/app/storage/storage.service';
import { CanvasObject } from '../canvas.model';


export class DragEvent {
    public constructor(
        public target: CanvasObject,
        public coord: Vec2 | null = null,
        public size: Size2 | null = null,
        public relatedCoord: Vec2 | null = null,
        public relatedSize: Size2 | null = null,
        public consumed: boolean = false,
        public dropIndex: number = 0,
    ) { }
}

export type CanvasDirectiveOptions = {
    ignoreDragFrom?: string,
    acceptDrop?: string,
    edges?: {
        left: boolean,
        right: boolean,
        bottom: boolean,
        top: boolean
    }
};

@Directive({
    selector: '[appDraggable]'
})
export class CanvasObjectDirective implements OnDestroy {

    @Input() enable: ('drag' | 'resizeSensor' | 'dropzone' | 'resize')[] = [];
    @Input() model!: CanvasObject;
    @Input() options: CanvasDirectiveOptions = {};

    @Output() dragStart = new EventEmitter<DragEvent>();
    @Output() dragMove = new EventEmitter<DragEvent>();
    @Output() dragEnd = new EventEmitter<DragEvent>();
    @Output() resizeStart = new EventEmitter<DragEvent>();
    @Output() resizeMove = new EventEmitter<DragEvent>();
    @Output() resizeEnd = new EventEmitter<DragEvent>();
    @Output() tap = new EventEmitter<any>();
    @Output() resize = new EventEmitter<Size2>();
    @Output() drop = new EventEmitter<CanvasObject>();

    constructor(private element: ElementRef, private ngZone: NgZone, private _storageService: StorageService) { }

    ngOnDestroy(): void {
        if(this._interactable) this._interactable.unset();
    }

    _resizeObserver: ResizeObserver | null = null;
    _interactable: Interactable | null = null;

    ngOnInit(): void {
        const self = this;
        this._interactable = interact(this.element.nativeElement)
            .on('tap', (event: any) => {
                this.tap.emit(event);
                event.stopPropagation();
            });

        if (this.enable.indexOf('drag') != -1) {
            this._interactable.draggable({
                ignoreFrom: self.options.ignoreDragFrom ?? undefined,
                inertia: false
            })
                .on('dragstart', (event: any) => {
                    let rect = event.currentTarget.getBoundingClientRect();
                    this.dragStart.emit(new DragEvent(this.model, new Vec2(event.clientX, event.clientY), null, new Vec2(rect.left, rect.top), new Size2(rect.width, rect.height)));
                })
                .on('dragmove', (event: any) => {
                    const x = event.dx;
                    const y = event.dy;
                    this.dragMove.emit(new DragEvent(this.model, new Vec2(x, y), null, new Vec2(event.clientX, event.clientY)));
                })
                .on('dragend', (event: any) => {
                    this.dragEnd.emit(new DragEvent(this.model, null));
                });
        }

        if (this.enable.indexOf('resizeSensor') != -1) {
            this._resizeObserver = new ResizeObserver((entries) => {
                this.ngZone.run(() => {
                    for (const entry of entries) {
                        this.resize.emit(new Size2(entry.contentRect.width, entry.contentRect.height));
                    }
                });
            });
            this._resizeObserver.observe(this.element.nativeElement);
        }

        if (this.enable.indexOf('dropzone') != -1) {
            this._interactable.dropzone({
                //ignoreFrom: '.ignore',
                accept: this.options.acceptDrop ?? undefined,//'.arrow-drag-handle',
                overlap: "pointer",

                ondropactivate: function (event: any) {
                    event.target.classList.add('drop-active');
                },
                ondragenter: function (event: any) {
                    var dropzoneElement = event.target;
                    dropzoneElement.classList.add('drop-selected');
                },
                ondragleave: function (event: any) {
                    event.target.classList.remove('drop-selected');
                },
                ondrop: function (event: any) {
                    self.drop.emit(self.model);
                },
                ondropdeactivate: function (event: any) {
                    event.target.classList.remove('drop-selected');
                    event.target.classList.remove('drop-active');
                }
            });
        }

        if (this.enable.indexOf('resize') != -1) {
            this._interactable.resizable({
                ignoreFrom: '.ignore-resize',
                edges: self.options.edges,
                listeners: {
                    start(event: any) {
                        self.resizeStart.emit(new DragEvent(self.model, null));
                    },
                    move(event: any) {
                        self.resizeMove.emit(new DragEvent(
                            self.model,
                            new Vec2(event.deltaRect.left, event.deltaRect.top),
                            new Size2(event.rect.width, event.rect.height),
                            null,
                            new Size2(event.deltaRect.right, event.deltaRect.bottom)
                        ));
                    },
                    end(event: any) {
                        self.resizeEnd.emit(new DragEvent(self.model));
                    }
                },
                modifiers: [
                ],
                inertia: false
            });
        }
    }
}
