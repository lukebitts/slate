import { Directive, OnInit, ElementRef, AfterViewInit, Input, HostListener } from '@angular/core';

@Directive({
    selector: '[appAutofocus]'
})
export class AutoFocusDirective implements AfterViewInit {

    constructor(private elementRef: ElementRef) {}
    
    ngAfterViewInit(): void {
        let el = this.elementRef.nativeElement;
        el.focus();
        //el.setSelectionRange(el.innerText.length,el.innerText.length);
        /*var range = document.createRange();
        var sel = window.getSelection();
        
        range.setStart(el.childNodes[0], 0);
        range.setEnd(el.childNodes[0], el.innerText.length);
        //range.collapse(true);
        
        if(sel) {
            sel.removeAllRanges();
            sel.addRange(range);
        }*/
    }

    @HostListener('onEditorCreated', ['$event'])
    onEditorCreated(event: any) {
        event.setSelection(event.getLength(), 0);
    }

}