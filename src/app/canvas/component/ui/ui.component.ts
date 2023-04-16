import { Component, EventEmitter, Input, Output } from '@angular/core';
import { first, Observable, of, takeUntil, takeWhile } from 'rxjs';
import { Vec2 } from 'src/app/common/math';
import { GoogleDriveService } from 'src/app/storage/google-drive-service/google-drive.service';
import { StorageService } from 'src/app/storage/storage.service';
import { CanvasObjectStore } from '../../canvas-object.store';
import { CanvasFolder, CanvasObject, isCanvasArrowTarget } from '../../canvas.model';
import { CanvasService } from '../../canvas.service';
import { DragEvent } from '../../directives/canvas-object.directive';
import { debounce, throttle } from '../text-area/text-area.component';
import { TextAreaService } from '../text-area/text-area.service';

@Component({
    selector: 'app-ui',
    templateUrl: './ui.component.html',
    styleUrls: ['./ui.component.scss']
})
export class UiComponent {

    @Input() loading: boolean = false;
    @Input() canCancelLoad: boolean = false;

    @Input() offset: Vec2 = Vec2.z();
    @Input() zoom: number = 1;

    color1: string = '';

    storageVisible: boolean = false;
    configVisible: boolean = false;

    darkModeEnabled = false;
    autoSyncEnabled = true;

    //@Input() onBold$: EventEmitter<boolean>|null = null;
    //@Input() onItalic$: EventEmitter<boolean>|null = null;

    @Output() dragStart$: EventEmitter<[DragEvent, string]> = new EventEmitter();
    @Output() dragMove$: EventEmitter<DragEvent> = new EventEmitter();
    @Output() dragEnd$: EventEmitter<DragEvent> = new EventEmitter();

    @Output() logoClick$: EventEmitter<void> = new EventEmitter();
    @Output() storageClick$: EventEmitter<void> = new EventEmitter();
    @Output() zoomClick$: EventEmitter<number> = new EventEmitter();
    @Output() saveClick$: EventEmitter<void> = new EventEmitter();

    @Output() onLoadingCancel: EventEmitter<void> = new EventEmitter();

    private _autoSaveCancel: any;

    constructor(
        public canvasService: CanvasService,
        public canvasStore: CanvasObjectStore,
        public textAreaService: TextAreaService,
        public storageService: StorageService,
        public driveService: GoogleDriveService
    ) {
        driveService.error$.subscribe((e) => {
            if (e) {
                this._autoSaveCancel();
                this.driveAuthenticate();
            }
        });

        let cachedDarkMode = localStorage.getItem('dark-mode-conf');
        let cachedAutoSync = localStorage.getItem('auto-sync-conf');

        if(cachedDarkMode) {
            this.darkModeEnabled = cachedDarkMode === 'true';
            this.onDarkModeChange({target:{checked: this.darkModeEnabled}} as any);
        }
        if(cachedAutoSync) {
            this.autoSyncEnabled = cachedAutoSync === 'true';
            this.onAutoSyncChange({target:{checked: this.autoSyncEnabled}} as any);
        }

        let debounceSave = debounce(() => {
            this.saveClick();
        }, 5000);

        this._autoSaveCancel = debounceSave[1];

        canvasService.saveState$.subscribe((saveState) => {
            if(storageService.error$.value === 'save') return;

            if(saveState === 'unsaved' && this.autoSyncEnabled && !storageService.error$.value) {
                debounceSave[0]();
            }
            if(saveState === 'loaded') {
                debounceSave[1]();
            }
        })
    }

    pathClick(obj: CanvasFolder) {
        this.canvasService.setCurrentRoot(obj, true, true);
    }

    cancelLoadClick() {
        this.onLoadingCancel.emit();
    }

    dragStart(event: DragEvent, tool: string) {
        this.dragStart$.emit([event, tool]);
    }

    dragMove(event: DragEvent) {
        this.dragMove$.emit(event);
    }

    dragEnd(event: DragEvent) {
        this.dragEnd$.emit(event);
    }

    logoClick() {
        this.logoClick$.emit();
    }

    storageClick() {
        this.configVisible = false;

        this.storageVisible = !this.storageVisible;
        this.storageClick$.emit();
    }

    configClick() {
        this.storageVisible = false;

        this.configVisible = !this.configVisible;
    }

    zoomOutClick() {
        this.zoomClick$.emit(1);
    }

    zoomInClick() {
        this.zoomClick$.emit(-1);
    }

    saveClick() {
        this._autoSaveCancel();
        this.saveClick$.emit();
    }

    boldClick(event: any) {
        this.textAreaService.toggleSelectedBold();
        this.stealClick(event);
    }

    italicClick(event: any) {
        this.textAreaService.toggleSelectedItalic();
        this.stealClick(event);
    }

    underlineClick(event: any) {
        this.textAreaService.toggleSelectedUnderline();
        this.stealClick(event);
    }

    strikethroughClick(event: any) {
        this.textAreaService.toggleSelectedStrikethrough();
        this.stealClick(event);
    }

    unorderedListClick(event: any) {
        this.textAreaService.toggleSelectedUnorderedList();
        this.stealClick(event);
    }

    orderedListClick(event: any) {
        this.textAreaService.toggleSelectedOrderedList();
        this.stealClick(event);
    }

    alignCenterClick(event: any) {
        this.textAreaService.toggleSelectedAlignCenter();
        this.stealClick(event);
    }

    stealClick(event: any) {
        event.preventDefault();
        event.stopPropagation();
    }

    arrowTipLeftClick(event: any, obj: CanvasObject) {
        if (obj.content.kind !== 'arrow') throw new Error('');

        obj.content.tipLeft = !obj.content.tipLeft;

        let refStart = obj.content.start;
        let refEnd = obj.content.end;

        if (refStart.kind == 'id' || refEnd.kind == 'id') throw new Error('');

        let start = this.canvasStore.getObject(refStart.object.id);
        let end = this.canvasStore.getObject(refEnd.object.id);
        if (!start || !end || !isCanvasArrowTarget(start) || !isCanvasArrowTarget(end)) throw new Error('');

        let [curve, pos, size] = this.canvasStore.calculateCurveInfo(start, end, obj.content.tipLeft ? 6 : 0, obj.content.tipRight ? 6 : 0);
        obj.content.curve = curve;
        obj.position = pos;
        obj.size = size;

        this.canvasService.addMomentToHistory();
    }

    arrowTipRightClick(event: any, obj: CanvasObject) {
        if (obj.content.kind !== 'arrow') throw new Error('');

        obj.content.tipRight = !obj.content.tipRight;

        let refStart = obj.content.start;
        let refEnd = obj.content.end;

        if (refStart.kind == 'id' || refEnd.kind == 'id') throw new Error('');

        let start = this.canvasStore.getObject(refStart.object.id);
        let end = this.canvasStore.getObject(refEnd.object.id);
        if (!start || !end || !isCanvasArrowTarget(start) || !isCanvasArrowTarget(end)) throw new Error('');

        let [curve, pos, size] = this.canvasStore.calculateCurveInfo(start, end, obj.content.tipLeft ? 6 : 0, obj.content.tipRight ? 6 : 0);
        obj.content.curve = curve;
        obj.position = pos;
        obj.size = size;

        this.canvasService.addMomentToHistory();
    }

    cpInputChange(e: any) {
        this.canvasService.addMomentToHistory();
    }

    emojiInputChange(e: any, obj: CanvasObject) {
        if (obj.content.kind !== 'folder') throw new Error('');
        obj.content.icon = e.emoji.native;
        this.canvasService.addMomentToHistory();
        this.stealClick(e.$event);
    }

    headingClick(n: number | false, event: any) {
        this.textAreaService.setHeading(n);
        this.stealClick(event);
    }

    async driveAuthenticate() {
        let error = this.driveService.error$.value;
        await this.driveService.authenticate();
        this.driveService.authenticated$
            .pipe(takeWhile(v => v !== true, true))
            .subscribe((val) => {
                if (val && this.autoSyncEnabled && (error === 'save' || (error === 'token' && this.canvasService.saveState$.value === 'unsaved'))) {
                    this.saveClick$.emit();
                }
            });
    }

    /* SETTINGS */

    onAutoSyncChange(event: Event) {
        let autoSync = (event.target as any).checked;
        this.autoSyncEnabled = autoSync;
        try {
            localStorage.setItem('auto-sync-conf', autoSync);
        } catch(e) {
            //no space left on local storage
        }
    }

    onDarkModeChange(event: Event) {
        let darkMode = (event.target as any).checked;
        if (darkMode) {
            document.querySelector('html')!.classList.remove('light');
            document.querySelector('html')!.classList.add('dark');
        } else {
            document.querySelector('html')!.classList.remove('dark');
            document.querySelector('html')!.classList.add('light');
        }

        this.darkModeEnabled = darkMode;
        try {
            localStorage.setItem('dark-mode-conf', darkMode);
        } catch(e) {
            //no space left on local storage
        }
    }
}
