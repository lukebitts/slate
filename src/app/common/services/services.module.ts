import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClipboardService } from './clipboard.service';



@NgModule({
    declarations: [
        ClipboardService
    ],
    imports: [
        CommonModule
    ],
    providers: [
        ClipboardService
    ]
})
export class ServicesModule { }
