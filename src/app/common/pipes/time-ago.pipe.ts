import {Pipe, PipeTransform} from "@angular/core";
import { format, render, cancel, register } from 'timeago.js';


@Pipe({"name": "timeAgo"})
export class TimeAgoPipe implements PipeTransform {

    constructor() {}

    transform (date: Date): string {
        return format(date, 'en_US');
    }

}
