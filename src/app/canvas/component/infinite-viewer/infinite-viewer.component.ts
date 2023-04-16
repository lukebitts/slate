import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import InfiniteViewer from "infinite-viewer";
import { Observable, of, range } from 'rxjs';
import { Vec2 } from 'src/app/common/math';
import { CanvasObjectStore } from '../../canvas-object.store';



@Component({
    selector: 'app-infinite-viewer',
    templateUrl: './infinite-viewer.component.html',
    styleUrls: ['./infinite-viewer.component.scss'],
})
export class InfiniteViewerComponent implements OnInit, OnDestroy {

    offset = Vec2.z();
    zoom = 1;

    @Input() forceZoom$: Observable<number> = of(this.zoom);
    @Input() offset$: Observable<Vec2> = of(this.offset.clone());
    @Input() useWheelScroll$: Observable<boolean> = of(true);

    @Output() onOffset$: EventEmitter<Vec2> = new EventEmitter();
    @Output() onZoom$: EventEmitter<number> = new EventEmitter();

    private _viewer: InfiniteViewer|null = null;

    constructor(private element: ElementRef, private _canvasStore: CanvasObjectStore) {
        
    }

    ngOnDestroy() {
        
    }

    ngOnInit(): void {
        this.initViewer([-100, 4000], [2000, 4000]);
        this.bindAllEvents();
    }

    initViewer(rangeX: [number, number], rangeY: [number, number]) {
        let viewEl = this.element.nativeElement;
        let viewportEl = viewEl.querySelector('.viewport');

        if(!viewportEl) return;

        const infiniteViewer = new InfiniteViewer(
            viewEl,
            viewportEl,
            {
                useTransform: true,
                useWheelScroll: true,
                
                wheelScale: 0.0005,
                //displayHorizontalScroll: false,
                //displayVerticalScroll: false,
                useMouseDrag: false,
                useAutoZoom: false,

                zoomRange: [0.1, 3],
                margin: 0,
                threshold: 0,
                zoom: 1,
                rangeX: rangeX,
                rangeY: rangeY,

            },
        );

        this._viewer = infiniteViewer;

        this._viewer.on('scroll', (evt: any) => {
            if (this._viewer) {
                let newOffset = new Vec2(Math.round(this._viewer.getScrollLeft()), Math.round(this._viewer.getScrollTop()));
                this.offset = newOffset.clone();
                this.onOffset$.next(newOffset);
            }
        })
        
    }

    bindAllEvents() {
        if(!this._viewer) return;// throw new Error('');

        this.forceZoom$.subscribe(s => {
            if (this._viewer) {
                this._viewer.setZoom(s);
                this.zoom = this._viewer.zoom;
                this.onZoom$.next(this.zoom);

                let newOffset = new Vec2(Math.round(this._viewer.getScrollLeft()), Math.round(this._viewer.getScrollTop()));
                this.offset = newOffset.clone();
                this.onOffset$.next(newOffset);

                this._canvasStore.bounds$.next(this._canvasStore.bounds$.value);
            }
        });

        this.offset$.subscribe(s => {
            if (this._viewer) {
                this._viewer.scrollTo(s.x, s.y);
                let newOffset = new Vec2(Math.round(this._viewer.getScrollLeft()), Math.round(this._viewer.getScrollTop()));
                this.offset = newOffset.clone();
                this.onOffset$.next(newOffset);
            }
        });

        this.useWheelScroll$.subscribe(s => {
            if(this._viewer) {
                this._viewer.useWheelScroll = s;
            }
        });

        this._canvasStore.bounds$.subscribe((val) => {
            if(!this._viewer) {
                return;
            }
            let rangeX: [number, number];
            let rangeY: [number, number];
            if(val) {
                const aa = window.screen.availWidth/this.zoom;
                const bb = window.screen.availHeight/this.zoom;
                const mm = 0.8;
                
                rangeX = [val[0].x-aa*mm, val[0].x+(val[1].w-aa)+(aa*mm)];
                rangeY = [val[0].y-bb*mm, val[0].y+(val[1].h-bb)+(bb*mm)];
            } else {
                rangeX = [-1000, 1000];
                rangeY = [-1000, 1000];
            }
            
            this._viewer.rangeX = rangeX;
            this._viewer.rangeY = rangeY;
        });
    }
}
