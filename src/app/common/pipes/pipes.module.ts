import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import { TimeAgoPipe } from "./time-ago.pipe";
import { CurvePointsPipe } from "./curve-points.pipe";
import { ImageHandleToDataUrlPipe } from "./image-handle-to-data-url.pipe";
import { StripHtmlPipe } from "./strip-html.pipe";



@NgModule({
    "declarations": [
        TimeAgoPipe,
        CurvePointsPipe,
        ImageHandleToDataUrlPipe,
        StripHtmlPipe,
    ],
    "imports": [CommonModule],
    "exports": [
        TimeAgoPipe,
        CurvePointsPipe,
        ImageHandleToDataUrlPipe,
        StripHtmlPipe
    ]
})
export class PipesModule { }
