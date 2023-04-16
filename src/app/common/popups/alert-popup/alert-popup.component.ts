import { ChangeDetectionStrategy, Component, EventEmitter, inject, OnInit, Renderer2 } from '@angular/core';
import { DialogService, DialogRef } from '@ngneat/dialog';



export interface AlertPopupData {
    title: string,
    body: string,
    icon: string|null,
    onConfirm: any,
    onCancel: any,
}

@Component({
    selector: 'app-alert-popup',
    templateUrl: './alert-popup.component.html',
    styleUrls: ['./alert-popup.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlertPopupComponent {
    ref: DialogRef<AlertPopupData> = inject(DialogRef);

    constructor() {
        
    }

}