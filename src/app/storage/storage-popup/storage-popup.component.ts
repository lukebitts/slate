import { ChangeDetectionStrategy, Component, inject, OnInit, Renderer2 } from '@angular/core';
import { DialogService, DialogRef } from '@ngneat/dialog';
import { AlertPopupComponent, AlertPopupData } from 'src/app/common/popups/alert-popup/alert-popup.component';
import { GoogleDriveService } from '../google-drive-service/google-drive.service';
import { FileRef, StorageService } from '../storage.service';



interface Data {
    title: string
}

@Component({
    selector: 'app-storage-popup',
    templateUrl: './storage-popup.component.html',
    styleUrls: ['./storage-popup.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StoragePopupComponent implements OnInit {
    ref: DialogRef<Data> = inject(DialogRef);

    constructor(
        public storageService: StorageService, 
        public driveService: GoogleDriveService, 
        private _renderer: Renderer2,
        private _dialog: DialogService,
    ) {
        
    }

    private _driveLoadSavedCredentialsIfExist() {

    }

    ngOnInit() {
        this.driveService.init(this._renderer);
    }

    async localCreateFile() {
        try {
            this.storageService.openFile(await this.storageService.createFile('Untitled', 'local'));
            this.ref.close();
        } catch(e) {
            const dialogRef = this._dialog.open(AlertPopupComponent, { 
                size: 'alertPopup',
                closeButton: false,
                enableClose: false,
                backdrop: false,
                data: {
                    title: 'LOCAL STORAGE FULL!',
                    body: 'You can create the file, however, it will need to be downloaded in order to be saved. Is that okay?',
                    icon: 'ban',
                    onConfirm: async () => {
                        this.storageService.openFile(await this.storageService.createFile('Untitled', 'none'));
                        dialogRef.close();
                        this.ref.close();
                    },
                    onCancel: () => {
                        dialogRef.close();
                    },
                } as AlertPopupData
            });
        }
    }

    async driveCreateFile() {
        this.storageService.openFile(await this.storageService.createFile('Untitled', 'drive'));
        this.ref.close();
    }

    async driveAuthenticate() {
        await this.driveService.authenticate();
    }

    driveSignout() {
        this.driveService.signout();
    }

    openFile(ref: FileRef) {
        if(ref.storage == 'local') {
            this.storageService.openFile(ref);
            this.ref.close();
        } else {
            this.storageService.openFile(ref);
            this.ref.close();
        }
    }
}