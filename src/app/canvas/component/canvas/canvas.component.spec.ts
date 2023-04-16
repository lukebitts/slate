import { Component, Input } from '@angular/core';
import { ComponentFixture, fakeAsync, inject, TestBed, tick, waitForAsync } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { DialogRef, provideDialogConfig } from '@ngneat/dialog';
import { Vec2 } from 'src/app/common/math';
import { LocalStorageService } from 'src/app/storage/local-storage/local-storage.service';
import { StorageService } from 'src/app/storage/storage.service';
import { CanvasObjectStore } from '../../canvas-object.store';
import { TextContent } from '../../canvas.model';
import { CanvasModule } from '../../canvas.module';
import { CanvasObjectDirective, DragEvent } from '../../directives/canvas-object.directive';
import { popperVariation, provideTippyConfig, TippyDirective, tooltipVariation } from '@ngneat/helipopper';

import { CanvasComponent } from './canvas.component';

describe('CanvasComponent', () => {
    let component: CanvasComponent;
    let fixture: ComponentFixture<CanvasComponent>;

    let storageService: StorageService;
    let storeService: CanvasObjectStore;
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [CanvasComponent],
            imports: [CanvasModule, TippyDirective, ],
            providers: [
                { provide: DialogRef, use: {} },
                provideTippyConfig({
                    defaultVariation: 'tooltip',
                    variations: {
                        tooltip: {
                            ...tooltipVariation,
                            //theme: 'light',
                            delay: 200,
                        },
                        popper: {
                            ...popperVariation,
                            hideOnClick: false,
                        },
                    }
                }),
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CanvasComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    beforeEach(inject([StorageService, CanvasObjectStore], (_storageService_: StorageService, _canvasStore_: CanvasObjectStore) => {
        storageService = _storageService_;
        storeService = _canvasStore_;
    }));

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Tests with file', () => {
        beforeEach(async () => {
            localStorage.clear();
            storageService.reset();
            let file = await storageService.createFile('test-file', 'local');
            storageService.openFile(file);
        });

        // can't figure out a way to make this work
        it('should set the html element to the correct text, and undo should set it back', async () => {
            /*let file = await storageService.createFile('test-file', 'local');
            storageService.openFile(file);
    
            component.onToolbarDragStart(new DragEvent(null as any, Vec2.z()), 'container');
            component.onToolbarDragMove(new DragEvent(null as any, new Vec2(10, 10)));
            component.onToolbarDragEnd(null as any);
    
            fixture.detectChanges();
    
            let objs = document.querySelectorAll('.canvas-object');
            expect(objs.length).toEqual(2);
    
            expect(objs[0].getAttribute('data-obj-id')).toEqual('1');
            expect(objs[1].getAttribute('data-obj-id')).toEqual('2');
    
            component.onTextClick(storeService.getObject(2)!, null as any);
    
            let tx = storeService.getEditing();
            expect(tx).toBeTruthy();

            await fixture.whenStable();
            fixture.detectChanges();
    
            let editor = objs[1].querySelectorAll('.ql-container');
            expect(editor.length).toEqual(1);

            (tx?.content as TextContent).text = '<div>Avatar</div>';

            storeService['setCurrentRoot'](null);
            //expect(tx.length).toEqual(1);
            //expect((tx[0]!.content as TextContent).text).toEqual('<div>Lorem ipsum dolor sit amet.</div>');
    
            await fixture.whenStable();
            fixture.detectChanges();

            let editor2 = objs[1].querySelectorAll('.ql-container');
            expect(editor2.length).toEqual(1);
            console.log(editor2[0].innerHTML);*/
            
        });
    });
});
