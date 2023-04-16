import {Pipe, PipeTransform} from "@angular/core";
import { stripHtml } from "src/app/canvas/canvas.model";
import { StorageService } from "src/app/storage/storage.service";


@Pipe({"name": "stripHtml"})
export class StripHtmlPipe implements PipeTransform {

    constructor() {}

    transform (text: string): string {
        return stripHtml(text);
    }

}
