import { Directive, ElementRef, EventEmitter, Output } from '@angular/core';
import Selecto from "selecto";
import { getElementInfo } from "moveable";


@Directive({
    selector: '[appBoxSelection]'
})
export class BoxSelectionDirective {

    @Output() select = new EventEmitter<any>();
    @Output() selectEnd = new EventEmitter<any>();

    constructor(private element: ElementRef) { }

    ngOnInit(): void {
        const selecto = new Selecto({
            // The container to add a selection element
            container: document.getElementById('viewer'),
            // Selecto's root container (No transformed container. (default: null)
            rootContainer: document.getElementById('viewer'),
            // The area to drag selection element (default: container)
            //dragContainer: Element,
            // Targets to select. You can register a queryselector or an Element.
            preventDragFromInside: true,
            selectableTargets: [".box-selectable"],
            // Whether to select by click (default: true)
            selectByClick: false,
            // Whether to select from the target inside (default: true)
            selectFromInside: false,
            // After the select, whether to select the next target with the selected target (deselected if the target is selected again).
            continueSelect: false,
            // Determines which key to continue selecting the next target via keydown and keyup.
            //toggleContinueSelect: "shift",
            // The container for keydown and keyup events
            keyContainer: window,
            // The rate at which the target overlaps the drag area to be selected. (default: 100)
            hitRate: 0,
            getElementRect: (el: HTMLElement | SVGElement): {
                pos1: number[];
                pos2: number[];
                pos3: number[];
                pos4: number[];
            } => {
                let r = getElementInfo(el);
                return r;
            },
        });

        selecto.on("selectEnd", (e:any) => {
            this.selectEnd.emit(e);
        });
        
        selecto.on("select", (e:any) => {
            this.select.emit(e);
        });
    }
}
