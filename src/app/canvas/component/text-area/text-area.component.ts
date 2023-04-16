import { Component, ElementRef, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Observable } from 'rxjs';
import interact from 'interactjs';
// @ts-ignore
import Squire from 'squire-rte';
import { TextAreaService } from './text-area.service';
import { FolderContent, TextContent, TitleContent } from '../../canvas.model';


export class TextSelectionState {
    public bold = false;
    public italic = false;
}


@Component({
    selector: 'app-text-area',
    templateUrl: './text-area.component.html',
    styleUrls: ['./text-area.component.scss']
})
export class TextAreaComponent implements OnInit {

    @Input() enabled: boolean = false;
    @Input() text: string = '';
    @Input() tux: TextContent|TitleContent|FolderContent|null = null;

    @Input() setBold: Observable<boolean> | null = null;
    @Input() setItalic: Observable<boolean> | null = null;

    @Output() focus: EventEmitter<void> = new EventEmitter();
    @Output() blur: EventEmitter<void> = new EventEmitter();
    @Output() blurAndChange: EventEmitter<void> = new EventEmitter();
    @Output() txinput: EventEmitter<any> = new EventEmitter();

    editor: any;
    textcopy: string = '';

    constructor(private _el: ElementRef, private _textAreaService: TextAreaService) { }

    ngOnInit() {
        this.textcopy = this.text;

        const el = this._el.nativeElement.querySelector('#editor');
    }

    onFocus(e: any) {
        this._textAreaService.setCurrentEditor(this.editor);
        this.focus.emit();
    }

    onBlur(e: any) {
        if(this._textAreaService['_currentEditor'] == this.editor)
            this._textAreaService.setCurrentEditor(null);


        this.blur.emit();

        if(this.tux) {
            if((this.tux.kind ==='text' || this.tux.kind === 'title') && this.tux.text != this.text) {
                this.tux.text = this.text;
                this.blurAndChange.emit();
            } else if (this.tux.kind === 'folder' && this.tux.name != this.text) {
                this.tux.name = this.text;
                this.blurAndChange.emit();
            }
        }
    }

    onEditorCreated(e: any) {
        this.editor = e;
    }

    onContentChanged = throttle((e) => this._onContentChanged(e), 1000);

    _onContentChanged(e: any) {
        this.txinput.emit(e.editor.root.innerHTML);
    }

    onSelectionChanged(e: any) {
        this._textAreaService.setSelection(this.editor, e);
    }

}

export function debounce<F extends (...args: any[]) => any>(func: F, delay: number) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let clearFn = () => { return () => clearTimeout(timeoutId); };
    return [
        function (this: ThisParameterType<F>, ...args: Parameters<F>) {
            //clearTimeout(timeoutId);
            clearFn()();
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        }, 
        clearFn()
    ];
}

export function throttle<F extends (...args: any[]) => any>(func: F, delay: number) {
    let lastCallTime: number | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    return function (this: ThisParameterType<F>, ...args: Parameters<F>) {
        const now = Date.now();
        if (!lastCallTime || now - lastCallTime >= delay) {
            func.apply(this, args);
            lastCallTime = now;
        } else if (!timeoutId) {
            timeoutId = setTimeout(() => {
                func.apply(this, args);
                lastCallTime = Date.now();
                timeoutId = undefined;
            }, delay - (now - lastCallTime));
        }
    };
}