import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasObjectStore } from './canvas-object.store';
import { CanvasComponent } from './component/canvas/canvas.component';
import { InfiniteViewerComponent } from './component/infinite-viewer/infinite-viewer.component';
import { CanvasService } from './canvas.service';
import { UiComponent } from './component/ui/ui.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TextAreaComponent } from './component/text-area/text-area.component';
import { CanvasObjectDirective } from './directives/canvas-object.directive';
import { BoxSelectionDirective } from './directives/box-selection.directive';
import { PipesModule } from '../common/pipes/pipes.module';
import { AutoFocusDirective } from './directives/auto-focus.directive';
import { QuillModule } from 'ngx-quill';
import { TextAreaService } from './component/text-area/text-area.service';
import { ColorPickerModule } from 'ngx-color-picker';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { TippyDirective } from '@ngneat/helipopper';

@NgModule({
    declarations: [
        CanvasComponent,
        InfiniteViewerComponent,
        CanvasObjectDirective,
        UiComponent,
        TextAreaComponent,
        BoxSelectionDirective,
        AutoFocusDirective,
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        PipesModule,
        QuillModule.forRoot(),
        ReactiveFormsModule,
        FormsModule,
        ColorPickerModule,
        PickerModule,
        TippyDirective
    ],
    providers: [
        CanvasObjectStore,
        CanvasService,
        TextAreaService,
    ],
    exports: [
        CanvasComponent,
        InfiniteViewerComponent,
    ]
})
export class CanvasModule { }
