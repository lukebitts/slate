import { Injectable } from "@angular/core";

import Quill from 'quill';
import { BehaviorSubject } from "rxjs";
import { Vec2 } from "src/app/common/math";
 
const parchment = Quill.import('parchment')
const block = parchment.query('block')
block.tagName = 'DIV'
//block.allowedChildren = block.allowedChildren.slice(1);
// or class NewBlock extends Block {} NewBlock.tagName = 'DIV'
Quill.register(block /* or NewBlock */, true);

(window as any).b = block;

@Injectable({
    "providedIn": "root"
})
export class TextAreaService {

    private _currentEditor: any|null = null;
    private _currentEl: any|null = null;

    public format$: BehaviorSubject<{
        bold: false|string,
        italic: false|string,
        underline: false|string,
        strike: false|string,
        list: false|string,
        align: false|string,
        header: number|null,
    }> = new BehaviorSubject({
        bold: false,
        italic: false,
        underline: false,
        strike: false,
        list: false,
        align: false,
        header: null,
    } as any);

    private _on(e: any) {
        console.log('on', e);
    }

    setCurrentEditor(editor: any|null) {
        this._currentEditor = editor;
        this.updateFormat();
    }

    setSelection(editor: any, selection: any) {
        if(this._currentEditor !== editor) return;

        this.updateFormat();
    }

    updateFormat() {
        let frmt;
        if(this._currentEditor){
            frmt = this._currentEditor.getFormat();
        } else {
            frmt = {
                bold: false,
                italic: false,
                underline: false,
                strikethrough: false,
                list: false,
                align: false,
                header: null,
            }
        }
        this.format$.next(frmt);
    }

    toggleSelectedBold() {
        if(!this._currentEditor) return;
        let sel = this._currentEditor.getSelection();
        let frmt = this._currentEditor.getFormat();
        this._currentEditor.formatText(sel.index, sel.length, 'bold', !frmt.bold);

        this.updateFormat();
    }

    toggleSelectedItalic() {
        if(!this._currentEditor) return;
        let sel = this._currentEditor.getSelection();
        let frmt = this._currentEditor.getFormat();
        this._currentEditor.formatText(sel.index, sel.length, 'italic', !frmt.italic);

        this.updateFormat();
    }

    toggleSelectedUnderline() {
        if(!this._currentEditor) return;
        let sel = this._currentEditor.getSelection();
        let frmt = this._currentEditor.getFormat();
        this._currentEditor.formatText(sel.index, sel.length, 'underline', !frmt.underline);

        this.updateFormat();
    }

    toggleSelectedStrikethrough() {
        if(!this._currentEditor) return;
        let sel = this._currentEditor.getSelection();
        let frmt = this._currentEditor.getFormat();
        this._currentEditor.formatText(sel.index, sel.length, 'strike', !frmt.strike);

        this.updateFormat();
    }

    toggleSelectedUnorderedList() {
        if(!this._currentEditor) return;
        let sel = this._currentEditor.getSelection();
        let frmt = this._currentEditor.getFormat();
        this._currentEditor.formatLine(sel.index, sel.length, 'list', frmt.list==='bullet'?false:'bullet', 'user');

        this.updateFormat();
    }

    toggleSelectedOrderedList() {
        if(!this._currentEditor) return;
        let sel = this._currentEditor.getSelection();
        let frmt = this._currentEditor.getFormat();
        this._currentEditor.formatLine(sel.index, sel.length, 'list', frmt.list==='ordered'?false:'ordered', 'user');

        this.updateFormat();
    }

    toggleSelectedAlignCenter() {
        if(!this._currentEditor) return;
        let sel = this._currentEditor.getSelection();
        let frmt = this._currentEditor.getFormat();
        this._currentEditor.formatLine(sel.index, sel.length, 'align', frmt.align==='center'?false:'center', 'user');

        this.updateFormat();
    }

    setHeading(n: number|false) {
        if(!this._currentEditor) return;
        let sel = this._currentEditor.getSelection();
        this._currentEditor.formatLine(sel.index, sel.length, 'header', n, 'user');
        let frmt = this._currentEditor.getFormat();

        this.updateFormat();
    }

}