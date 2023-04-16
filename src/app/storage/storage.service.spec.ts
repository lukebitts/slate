import { Renderer2 } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GoogleDriveService } from './google-drive-service/google-drive.service';

import { StorageService } from './storage.service';

describe('StorageService', () => {
    let service: StorageService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                { provide: GoogleDriveService, use: {
                    files$: {
                        subscribe: () => {}
                    }
                } },
            ]
        });
        service = TestBed.inject(StorageService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
