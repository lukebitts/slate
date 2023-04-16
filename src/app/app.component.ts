import { Component, EventEmitter, OnInit, Renderer2 } from '@angular/core';
import { DialogService } from '@ngneat/dialog';
import { first, takeUntil, takeWhile } from 'rxjs';
import { CanvasService } from './canvas/canvas.service';
import { GoogleDriveService } from './storage/google-drive-service/google-drive.service';
import { StoragePopupComponent } from './storage/storage-popup/storage-popup.component';
import { StorageService } from './storage/storage.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
    title = 'slate';

    loading = false;
    canCancelLoad = false;

    private _cancelLoadLastFile$: EventEmitter<void> = new EventEmitter();

    constructor(
        private _renderer: Renderer2, 
        private _dialog: DialogService, 
        private _storageService: StorageService,
        private _canvasService: CanvasService,
        public driveService: GoogleDriveService) 
    {}

    ngOnInit(): void {
        let lastOpened = localStorage.getItem('slate-last');
        
        if(!lastOpened) {
            const dialogRef = this._dialog.open(
                StoragePopupComponent, { 
                    size: 'storagePopup',
                    enableClose: false,
                    closeButton: false,
                    //backdrop: false,
                }
            );
        } else {
            let parsed = JSON.parse(lastOpened);

            if(parsed.storage === 'local') {
                this._storageService.files$.pipe(first()).subscribe(files => {
                    let parsed = JSON.parse(lastOpened!);
                    let idx = files.findIndex(f => f.uuid == parsed.uuid);
                    if(idx != -1) {
                        // wait a single frame, otherwise local storage file opens too fast
                        // for the viewportHistory to reset. Not sure of the root cause.
                        setTimeout(()=>{
                            this._storageService.openFile(files[idx]);
                        }, 0); 
                    } else {
                        console.error('last file could not be opened D:');
                    }
                });
            } else {
                this.canCancelLoad = true;
                this.loading = true;
                this.driveService.init(this._renderer);

                let canceled = false;
                this._cancelLoadLastFile$.pipe(first()).subscribe(() => {
                    canceled = true;
                });

                let sub = this.driveService.files$.subscribe(async (files) => {
                    if(files != null) {
                        let idx = files.findIndex(f => f.uuid == parsed.uuid);
                        if(idx != -1) {
                            this.loading = false;
                            this.canCancelLoad = false;
                            if(!canceled) {
                                await this._storageService.openFile(files[idx]);
                            }
                        } else {
                            this.driveService.authenticated$.pipe(
                                takeWhile((val) => val === false, true), 
                                takeUntil(this._cancelLoadLastFile$)
                            ).subscribe(async (auth) => {
                                if(auth) {
                                    this.canCancelLoad = false;
                                    let files2 = this._storageService['_driveFiles'];
                                    let idx = files2.findIndex(f => f.uuid == parsed.uuid);
                                    if(idx != -1) {
                                        //await this._storageService.openFile(files2[idx]);
                                        this.loading = false;
                                    } else {
                                        this.loading = false;
                                        const dialogRef = this._dialog.open(
                                            StoragePopupComponent, { 
                                                size: 'storagePopup',
                                                enableClose: false,
                                                closeButton: false,
                                                //backdrop: false,
                                            }
                                        );
                                    }
                                }
                            });
                        }
                        sub.unsubscribe();
                    }
                });
            }
        }

        this._canvasService.attemptingLogin$.subscribe(val => {
            if(val) {
                this.loading = true;
                this.canCancelLoad = true;
            } else {
                this.loading = false;
                this.canCancelLoad = false;
            }
        })
    }

    onLoadingCancel() {
        this._canvasService.cancelLoginAttempt$.emit();
        this.canCancelLoad = false;
        this._cancelLoadLastFile$.emit();
        this.loading = false;
        const dialogRef = this._dialog.open(
            StoragePopupComponent, { 
                size: 'storagePopup',
                enableClose: false,
                closeButton: false,
                //backdrop: false,
            }
        );
    }
}
