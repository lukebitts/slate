import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoragePopupComponent } from './storage-popup/storage-popup.component';
import { StorageService } from './storage.service';
import { GoogleDriveService } from './google-drive-service/google-drive.service';
import { PipesModule } from '../common/pipes/pipes.module';
import { PopupsModule } from '../common/popups/popups.module';
import { LocalStorageService } from './local-storage/local-storage.service';



@NgModule({
    declarations: [
        StoragePopupComponent
    ],
    imports: [
        CommonModule,
        PipesModule,
        PopupsModule,
    ],
    providers: [
        GoogleDriveService,
        LocalStorageService,
        StorageService
    ],
    exports: [
        StoragePopupComponent
    ]
})
export class StorageModule { }
