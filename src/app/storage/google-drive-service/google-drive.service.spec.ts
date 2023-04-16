import { Renderer2 } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { GoogleDriveService } from './google-drive.service';

describe('GoogleDriveService', () => {
    let service: GoogleDriveService;
    //let renderer2: Renderer2;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                GoogleDriveService,
                Renderer2
            ]
        });
        service = TestBed.inject(GoogleDriveService);
        //renderer2 = TestBed.inject(Renderer2);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should init', () => {
        //service.init(renderer2);
    });
});
