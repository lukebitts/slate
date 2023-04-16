import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogRef } from '@ngneat/dialog';

import { AlertPopupComponent } from './alert-popup.component';

class MockDialogRef {
    data = {
        title: 'title',
        body: 'body',
        icon: 'icon',
        onConfirm: null,
        onCancel: null,
    };
}

describe('AlertPopupComponent', () => {
    let component: AlertPopupComponent;
    let fixture: ComponentFixture<AlertPopupComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            declarations: [AlertPopupComponent],
            providers: [
                { provide: DialogRef, use: new MockDialogRef() }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(AlertPopupComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
