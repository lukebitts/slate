import { Renderer2 } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogRef } from '@ngneat/dialog';
import { PipesModule } from 'src/app/common/pipes/pipes.module';
import { GoogleDriveService } from '../google-drive-service/google-drive.service';

import { StoragePopupComponent } from './storage-popup.component';

class MockGoogleDriveService {
    init() {}
    files$ = {
        subscribe: () => {}
    }
    error$ = {
        subscribe: () => {}
    }
}
class MockDialogRef {}

describe('StoragePopupComponent', () => {
    let component: StoragePopupComponent;
    let fixture: ComponentFixture<StoragePopupComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [StoragePopupComponent],
            providers: [
                { provide: GoogleDriveService, useClass: MockGoogleDriveService },
                { provide: DialogRef, useClass: MockDialogRef }
            ],
            imports: [
                PipesModule
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(StoragePopupComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
