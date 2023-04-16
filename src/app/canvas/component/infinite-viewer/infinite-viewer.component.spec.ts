import { ElementRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InfiniteViewerComponent } from './infinite-viewer.component';


describe('CanvasComponent', () => {
    let component: InfiniteViewerComponent;
    let fixture: ComponentFixture<InfiniteViewerComponent>;

    beforeEach(async() => {
        await TestBed.configureTestingModule({
            declarations: [InfiniteViewerComponent],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(InfiniteViewerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', async () => {
        await fixture.whenRenderingDone().then(() => {
            expect(component).toBeTruthy();
        });
    });
});
/*import { ElementRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InfiniteViewerComponent } from './infinite-viewer.component';

describe('CanvasComponent', () => {
    let component: InfiniteViewerComponent;
    let fixture: ComponentFixture<InfiniteViewerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [InfiniteViewerComponent],
            providers: [{ provide: ElementRef, useValue: { nativeElement: document.createElement('div') } }],
        })
        .compileComponents();

        fixture = TestBed.createComponent(InfiniteViewerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});*/
