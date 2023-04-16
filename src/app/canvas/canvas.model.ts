import { getBoxToBoxArrow } from "curved-arrows";
import { assert, isBoolean, IsInterface, isLikeObject, isObject, isSingletonString, isString, isStringEnumeration, TypeGuard } from "generic-type-guard";
import { L } from "ts-toolbelt";
import { Size2, Vec2 } from "../common/math";
import { assertUnreachable } from "../common/types";
import { StorageService } from "../storage/storage.service";
import { CanvasObjectStore } from "./canvas-object.store";
import { CanvasDirectiveOptions } from "./directives/canvas-object.directive";

export const stripHtml = (html: string) => {
    let doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || "";
};

export type CanvasId = number;
type ArrowTargetIdRef = { kind: 'id', id: CanvasId };
type ArrowTargetObjectRef = { kind: 'object', object: CanvasObject<CanvasArrowTarget> };
type ArrowTargetRef = ArrowTargetIdRef | ArrowTargetObjectRef;

export function idRef(id: CanvasId): ArrowTargetIdRef {
    return { kind: 'id', id: id };
}

export function objectRef(object: CanvasObject<CanvasArrowTarget>): ArrowTargetObjectRef {
    return { kind: 'object', object: object };
}

export function upgradeRef(ref: ArrowTargetIdRef, store: CanvasObjectStore): ArrowTargetObjectRef {
    let obj = store.getObject(ref.id);
    if (!obj) throw new Error(`[upgradeRef] could not upgrade ref with id ${ref.id}`);
    if (isCanvasArrowTarget(obj)) {
        return { kind: 'object', object: obj };
    } else {
        throw new Error(`[upgradeRef] could not upgrade ref with id because it is not an arrow`);
    }
}

export function getRefId(ref: ArrowTargetRef): CanvasId {
    if (ref.kind == 'id') return ref.id;
    if (ref.kind == 'object') return ref.object.id;
    else throw new Error(`[getRefId] unkwnown ref kind impossible`);
}

const ARROW_DROP_CLASS = '.arrow-link';

export interface Serializable<T> {
    getSerializable(): any;
    //static deserialize(input: any): T|null;
}

enum ContentKindEnum {
    Text = 'text',
    Container = 'container',
}

type ImageSerializable = { kind: ImageContent['kind'], handle: string };

export class ImageContent {
    kind = 'image' as const;

    //resizable: [string, string] = ['full', 'bottom'];
    boxSelectable: [boolean, boolean] = [true, false];
    rootControls = ['drag', 'dropzone', 'resize'];
    rootOptions: CanvasDirectiveOptions = {
        ignoreDragFrom: ".ignore-drag",
        acceptDrop: '.arrow-handle',
        edges: {left:true,right:true,bottom:true,top:true},
    };
    childControls = ['drag', 'dropzone', 'resize'];
    childOptions: CanvasDirectiveOptions = {
        ignoreDragFrom: '.ignore-drag',
        acceptDrop: '.arrow-handle',
        edges: {left:false,right:false,bottom:true,top:false},
    };

    constructor(public handle: string, public isNew: boolean) { }

    shallowClone(): ImageContent {
        return new ImageContent(this.handle, this.isNew);
    }

    getSerializable(): ImageSerializable {
        return { kind: this.kind, handle: this.handle };
    }

    toHtmlText(storageService: StorageService): string {
        let data = storageService.getLoadedImageData(this.handle);
        let html = `<div class="content" data-slate-kind="image" data-slate-handle="${this.handle}">`;
        if(data) {
            html += `<img src="${data}"/>`
        }
        html += '</div>';
        return html;
    }

    toText(): string {
        return '<image could not be pasted>';
    }

    static htmlToSerializable(el: Element, storageService: StorageService): ImageSerializable {
        if(el.getAttribute('data-slate-kind') !== 'image') {
            throw new Error('');
        }

        let handleAttr = el.getAttribute('data-slate-handle');

        if(!handleAttr && handleAttr != '') throw new Error('');

        if(handleAttr != '') {
            if(!storageService.getLoadedImageData(handleAttr)) {
                let imgEl = el.querySelector('img');
                if(!imgEl) throw new Error('');

                let src = imgEl.getAttribute('src');
                if(!src) throw new Error('');

                handleAttr = storageService.createImage(src).id;
            } else {
                storageService.moveImageRefCount(handleAttr, +1);
            }
        }

        return {
            kind: 'image',
            handle: handleAttr,
        };
    }

    static isImageSerializable: TypeGuard<ImageSerializable> = new IsInterface()
        .withProperty('kind', isSingletonString('image'))
        .withProperty('handle', isString)
        .get();

    static deserialize(input: Partial<ImageSerializable>): ImageContent {
        if(ImageContent.isImageSerializable(input)) {
            return new ImageContent(input.handle, false);
        }
        
        throw new Error(`[TextContent:deserialize]`);
    }
}

type TextSerializable = { kind: TextContent['kind'], text: string };

export class TextContent {
    kind = 'text' as const;

    //draggable: [boolean, boolean] = [true, true];
    //resizable: [string, string] = ['full', 'bottom'];
    //editable: [boolean, boolean] = [true, true];
    boxSelectable: [boolean, boolean] = [true, false];
    //dropAreaFor: string | null = ARROW_DROP_CLASS;

    rootControls = ["drag", "dropzone", "resize"];
    rootOptions: CanvasDirectiveOptions = {
        ignoreDragFrom: ".ignore-drag",
        acceptDrop: ".arrow-handle",
        edges: {left:true,right:true,bottom:false,top:false},
    };
    childControls = ["drag", "dropzone"];
    childOptions: CanvasDirectiveOptions = {
        ignoreDragFrom: ".ignore-drag",
        acceptDrop: ".arrow-handle",
        edges: {left:false,right:false,bottom:false,top:false},
    };

    constructor(public text: string) { }

    shallowClone(): TextContent {
        return new TextContent(this.text);
    }

    getSerializable(): TextSerializable {
        return { kind: this.kind, text: this.text };
    }

    toHtmlText(): string {
        let html = '<div class="content" data-slate-kind="text">';
        html += this.text.replace(/<br>/g, '<br/>');
        html += '</div>';
        return html;
    }

    toText(): string {
        return stripHtml(this.text.replace(/<br>/g, '\n'));
    }

    static htmlToSerializable(el: Element): TextSerializable {
        if(el.getAttribute('data-slate-kind') !== 'text') {
            throw new Error('');
        }

        let text = el.innerHTML;

        return {
            kind: 'text',
            text: text,
        };
    }

    static isTextSerializable: TypeGuard<TextSerializable> = new IsInterface()
        .withProperty('kind', isSingletonString('text'))
        .withProperty('text', isString)
        .get();

    static deserialize(input: Partial<TextSerializable>): TextContent {
        if(TextContent.isTextSerializable(input)) {
            return new TextContent(input.text);
        }
        
        throw new Error(`[TextContent:deserialize] ${JSON.stringify(input, null, 2)}`);
        /*
        if (!('kind' in input) || input.kind != 'text') throw new Error('deserialize error');;

        if ('text' in input && input.text !== undefined) {
            return new TextContent(input.text);
        }

        throw new Error('deserialize error');
        */
    }
}

type TitleSerializable = { kind: TitleContent['kind'], text: string };

export class TitleContent {
    kind = 'title' as const;

    boxSelectable: [boolean, boolean] = [true, false];
    rootControls = ["drag", "dropzone", "resize"];
    rootOptions: CanvasDirectiveOptions = {
        ignoreDragFrom: ".ignore-drag",
        acceptDrop: ".arrow-handle",
        edges: {left:true,right:true,bottom:false,top:false},
    };
    childControls = ["drag", "dropzone"];
    childOptions: CanvasDirectiveOptions = {
        ignoreDragFrom: ".ignore-drag",
        acceptDrop: ".arrow-handle",
        edges: {left:false,right:false,bottom:false,top:false},
    };

    constructor(public text: string) { }

    shallowClone(): TitleContent {
        return new TitleContent(this.text);
    }

    getSerializable(): TitleSerializable {
        return { kind: this.kind, text: this.text };
    }

    toHtmlText(): string {
        let html = '<div class="content" data-slate-kind="title">';
        html += this.text.replace(/<br>/g, '<br/>');
        html += '</div>';
        return html;
    }

    toText(): string {
        return stripHtml(this.text.replace(/<br>/g, '\n'));
    }

    static htmlToSerializable(el: Element): TitleSerializable {
        if(el.getAttribute('data-slate-kind') !== 'title') {
            throw new Error('');
        }

        let text = el.innerHTML;

        return {
            kind: 'title',
            text: text,
        };
    }

    static isTitleSerializable: TypeGuard<TitleSerializable> = new IsInterface()
        .withProperty('kind', isSingletonString('title'))
        .withProperty('text', isString)
        .get();

    static deserialize(input: Partial<TitleSerializable>): TitleContent {
        if(TitleContent.isTitleSerializable(input)) {
            return new TitleContent(input.text);
        }
        
        throw new Error(`[TitleContent:deserialize] ${JSON.stringify(input, null, 2)}`);
    }
}

export type CurveInfo = {
    sx: number,
    sy: number,
    c1x: number,
    c1y: number,
    c2x: number,
    c2y: number,
    ex: number,
    ey: number,
    ae: number,
    as: number,
};
export type ArrowSerializable = { kind: ArrowContent['kind'], start: CanvasId, end: CanvasId, curve: CurveInfo | null, tipLeft: boolean, tipRight: boolean };

export class ArrowContent {
    kind = 'arrow' as const;

    //draggable: [boolean, boolean] = [false, false];
    resizable: [string, string] = ['none', 'none'];
    //editable: [boolean, boolean] = [false, false];
    boxSelectable: [boolean, boolean] = [true, false];
    //dropAreaFor: string | null = null;

    rootControls = [];
    rootOptions: CanvasDirectiveOptions = {};
    childControls = [];
    childOptions: CanvasDirectiveOptions = {};

    //curve: CurveInfo|null = null;

    constructor(public start: ArrowTargetRef, public end: ArrowTargetRef, public curve: CurveInfo | null, public tipLeft: boolean, public tipRight: boolean) { }

    shallowClone(): ArrowContent {
        return new ArrowContent(this.start, this.end, this.curve, this.tipLeft, this.tipRight);
    }

    getSerializable(): ArrowSerializable {
        return { 
            kind: this.kind, 
            start: getRefId(this.start), 
            end: getRefId(this.end), 
            curve: this.curve?{...this.curve}:null,
            tipLeft: this.tipLeft,
            tipRight: this.tipRight,
        };
    }

    static deserialize(input: Partial<ArrowSerializable>): ArrowContent {
        if (!('kind' in input) || input.kind != 'arrow') throw new Error('deserialize error');;

        if (
            ('start' in input && input.start !== undefined) &&
            ('end' in input && input.end !== undefined) &&
            ('curve' in input && input.curve !== undefined) && 
            ('tipLeft' in input && input.tipLeft !== undefined) && 
            ('tipRight' in input && input.tipRight !== undefined)
        ) {
            return new ArrowContent(idRef(input.start), idRef(input.end), input.curve, input.tipLeft, input.tipRight);
        }

        throw new Error('deserialize error');
    }

    static getBoundingBox(curve: CurveInfo, thickness: number = 30): [Vec2, Size2] {
        const points = [
            { x: curve.sx, y: curve.sy },
            { x: curve.c1x, y: curve.c1y },
            { x: curve.c2x, y: curve.c2y },
            { x: curve.ex, y: curve.ey },
        ];
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const point of points) {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        }
        return [new Vec2(minX - thickness, minY - thickness), new Size2(maxX - minX + (2* thickness), maxY - minY + (2* thickness))];
    }

    static recalculateCurve(
        fromX: number, fromY: number, fromW: number, fromH: number,
        toX: number, toY: number, toW: number, toH: number, padStart: number, padEnd: number
    ): [CurveInfo, Vec2, Size2] {
        let curveParts = getBoxToBoxArrow(
            fromX, fromY, fromW, fromH,
            toX, toY, toW, toH, { padStart: padStart, padEnd: padEnd }
        );
        let [sx, sy, c1x, c1y, c2x, c2y, ex, ey, ae, as] = curveParts;
        let baseCurve = {
            sx: sx,
            sy: sy,
            c1x: c1x,
            c1y: c1y,
            c2x: c2x,
            c2y: c2y,
            ex: ex,
            ey: ey,
            ae: ae,
            as: as,
        };
        
        let [pos,size] = ArrowContent.getBoundingBox(baseCurve);

        let curve = {
            sx: sx - pos.x,
            sy: sy - pos.y,
            c1x: c1x - pos.x,
            c1y: c1y - pos.y,
            c2x: c2x - pos.x,
            c2y: c2y - pos.y,
            ex: ex - pos.x,
            ey: ey - pos.y,
            ae: ae,
            as: as,
        };

        return [curve, pos, size];
    }

    toHtmlText(): string {
        let data = this.getSerializable();

        let html = `<div class="content" data-slate-kind="arrow"`;
        html += ` data-slate-start="${data.start}"`;
        html += ` data-slate-end="${data.end}"`;
        html += ` data-slate-curve="${encodeURI(JSON.stringify(data.curve))}"`;
        html += ` data-slate-tipLeft="${data.tipLeft}"`;
        html += ` data-slate-tipRight="${data.tipRight}"`;
        html += '>';
        //If we ever want to copy arrows as images, but probably not what the user wants.
        /*
        if(data.curve) {
            let svg = document.createElement('svg');
            svg.setAttribute('width', `${data.curve.ex-data.curve.sx}`);
            svg.setAttribute('height', `${data.curve.ey-data.curve.sy}`);
            let path = document.createElement('path');
            path.setAttribute('d', `M ${data.curve.sx} ${data.curve.sy} C ${data.curve.c1x} ${data.curve.c1y}, ${data.curve.c2x} ${data.curve.c2y}, ${data.curve.ex} ${data.curve.ey}`);
            path.setAttribute('stroke', 'black');
            path.setAttribute('stroke-width', '3');
            path.setAttribute('fill', 'none');
            svg.appendChild(path);

            let s = new XMLSerializer().serializeToString(svg);
            var encodedData = window.btoa(s);

            console.log('enc', encodedData);

            html +=  
            `
            <img src='data:image/svg;base64,${encodedData}'/>
            `;
        }*/

        html += '</div>';
        return html;
    }

    toText(): string {
        return '';
    }

    static htmlToSerializable(el: Element): ArrowSerializable {
        if(el.getAttribute('data-slate-kind') !== 'arrow') {
            throw new Error('');
        }

        let start = el.getAttribute('data-slate-start');
        let end = el.getAttribute('data-slate-end');
        let curve = el.getAttribute('data-slate-curve');
        let tipLeft = el.getAttribute('data-slate-tipLeft');
        let tipRight = el.getAttribute('data-slate-tipRight');

        if(!start) throw new Error('');
        if(!end) throw new Error('');
        if(!curve) throw new Error('');
        if(!tipLeft) throw new Error('');
        if(!tipRight) throw new Error('');
        
        return {
            kind: 'arrow',
            start: parseInt(start),
            end: parseInt(end),
            curve: JSON.parse(decodeURI(curve)),
            tipLeft: tipLeft==='true',
            tipRight: tipRight==='true',
        };
    }
}

type ContainerSerializable = { kind: ContainerContent['kind'], title: string, objects: CanvasObjectSerializable[] };

export class ContainerContent {
    kind = 'container' as const;

    //draggable: [boolean, boolean] = [true, true];
    resizable: [string, string] = ['sides', 'none'];
    //editable: [boolean, boolean] = [true, true];
    boxSelectable: [boolean, boolean] = [true, false];
    //dropAreaFor: string | null = ARROW_DROP_CLASS;

    rootControls = ["drag", "dropzone", "resize"];
    rootOptions: CanvasDirectiveOptions = {
        ignoreDragFrom: ".ignore-drag",
        acceptDrop: ".arrow-handle",
        edges: {left:true,right:true,bottom:false,top:false},
    };
    childControls = ["drag", "dropzone"];
    childOptions: CanvasDirectiveOptions = {
        ignoreDragFrom: ".ignore-drag",
        acceptDrop: ".arrow-handle",
        edges: {left:false,right:false,bottom:false,top:false},
    };

    constructor(public title: string, public objects: CanvasObject<CanvasAddable>[]) { }

    static empty(title: string): CanvasEmptyContainer {
        return new ContainerContent(title, []) as CanvasEmptyContainer;
    }

    shallowClone(): ContainerContent {
        return new ContainerContent(this.title, this.objects);
    }

    getSerializable(): ContainerSerializable {
        return { kind: this.kind, title: this.title, objects: this.objects.map(o => o.getSerializable()) };
    }

    toHtmlText(storageService: StorageService): string {
        let html = '<div class="content" data-slate-kind="container">';
        html += `<h1></h1>`;

        for(const obj of this.objects) {
            html += obj.toHtmlText(null, storageService);
        }

        html += '</div>';
        return html;
    }

    toText(): string {
        return `${this.objects.map(o => {
            return o.toText();
        }).join('')}`;
    }

    static htmlToSerializable(el: Element, storageService: StorageService): ContainerSerializable {
        if(el.getAttribute('data-slate-kind') !== 'container') {
            throw new Error('');
        }

        let title = el.querySelector('h1');

        if(!title) {
            throw new Error('');
        }

        let objects: CanvasObjectSerializable[] = [];
        for(let idx = 1; idx < el.children.length; idx++) {
            let childEl = el.children[idx];

            let kindAttr = childEl.getAttribute('data-slate-kind');
            
            if(kindAttr === 'object') {
                objects.push(CanvasObject.htmlToSerializable(childEl, storageService));
            } else {
                throw new Error('unknown kind');
            }
        }

        return {
            kind: 'container',
            objects: objects,
            title: title.innerHTML,
        };
    }

    static deserialize(input: Partial<ContainerSerializable>): ContainerContent {
        if (!('kind' in input) || input.kind != 'container') throw new Error('deserialize error');;

        if (
            ('title' in input && input.title != undefined) &&
            ('objects' in input && input.objects != undefined)
        ) {
            return new ContainerContent(input.title, input.objects.map(o => {
                let deserialized = CanvasObject.deserialize(o);
                if (!deserialized) throw new Error('deserialize error');
                if (deserialized.content.kind == 'arrow') throw new Error('[ContainerContent::deserialize] arrows are not permitted in containers');
                return deserialized as CanvasObject<CanvasAddable>;
            }));
        } else {
            throw new Error(`[deserialize error] input: ${input}`)
        }
    }
}

type FolderSerializable = { kind: FolderContent['kind'], name: string, color: string, icon: string, objects: CanvasObjectSerializable[] };

export class FolderContent {
    kind = 'folder' as const;

    //draggable: [boolean, boolean] = [true, true];
    resizable: [string, string] = ['none', 'none'];
    //editable: [boolean, boolean] = [true, true];
    boxSelectable: [boolean, boolean] = [true, false];
    //dropAreaFor: string | null = ARROW_DROP_CLASS;

    rootControls = ["dropzone"];
    rootOptions: CanvasDirectiveOptions = {
        ignoreDragFrom: ".ignore-drag",
        acceptDrop: ".arrow-handle"
    };
    childControls = ["dropzone"];
    childOptions: CanvasDirectiveOptions = {
        ignoreDragFrom: ".ignore-drag",
        acceptDrop: ".arrow-handle"
    };

    constructor(public name: string, public color: string, public icon: string, public objects: CanvasObject<CanvasContent>[]) { }

    static empty(name: string, color: string, icon: string): CanvasEmptyFolder {
        return new FolderContent(name, color, icon, []) as CanvasEmptyFolder;
    }

    shallowClone(): FolderContent {
        return new FolderContent(this.name, this.color, this.icon, this.objects);
    }

    getSerializable(): FolderSerializable {
        return { kind: this.kind, name: this.name, color: this.color, icon: this.icon, objects: this.objects.map(o => o.getSerializable()) };
    }

    static deserialize(input: Partial<FolderSerializable>): FolderContent {
        if (!('kind' in input) || input.kind != 'folder') throw new Error('deserialize error');

        if (
            ('name' in input && input.name != undefined) &&
            ('color' in input && input.color != undefined) &&
            ('objects' in input && input.objects != undefined) &&
            ('icon' in input && input.icon != undefined)
        ) {
            return new FolderContent(input.name, input.color, input.icon, input.objects.map(o => {
                let deserialized = CanvasObject.deserialize(o);
                if (!deserialized) throw new Error('deserialize error');
                return deserialized;
            }));
        } else {
            throw new Error(`[deserialize error] input: ${input}`)
        }
    }

    toHtmlText(): string {
        let hiddenData = encodeURI(JSON.stringify(this.getSerializable()));
        let html = `<div class="content" data-slate-kind="folder" data-slate-folder-data="${hiddenData}">`;

        
        html += `<h2 color='${this.color}'><span>${this.icon}</span><span>${this.name}</span></h2>`;

        html += '</div>';
        return html;
    }

    toText(): string {
        return `${this.icon} ${this.name}`;
    }

    static htmlToSerializable(el: Element): FolderSerializable {
        if(el.getAttribute('data-slate-kind') !== 'folder') {
            throw new Error('');
        }

        let hiddenData = el.getAttribute('data-slate-folder-data');
        if(!hiddenData) throw new Error('');

        let h2El = el.querySelector('h2');
        if(!h2El) throw new Error('');
        
        let spanEls = h2El?.querySelectorAll('span');
        if(!spanEls || spanEls.length != 2) throw new Error('');
        
        let color = h2El.getAttribute('color');
        if(!color) throw new Error('');

        let icon = spanEls[0].innerHTML;
        let name = spanEls[1].innerHTML;
        
        return {
            kind: 'folder',
            objects: JSON.parse(decodeURI(hiddenData)).objects,
            color,
            icon,
            name
        };
    }
}

export type ContentSerializable = TextSerializable | ArrowSerializable | ContainerSerializable | FolderSerializable | ImageSerializable | TitleSerializable;

type CanvasEmptyContainer = ContainerContent & { objects: [] };
type CanvasEmptyFolder = FolderContent & { objects: [] };

export type CanvasContent = TextContent | ArrowContent | ContainerContent | FolderContent | ImageContent | TitleContent;
export type CanvasAddable = TextContent | CanvasEmptyContainer | CanvasEmptyFolder | ImageContent | TitleContent;
export type CanvasArrowTarget = TextContent | ContainerContent | FolderContent | ImageContent | TitleContent;

export function isCanvasAddable(obj: CanvasObject): obj is CanvasObject<CanvasAddable> {
    return ['text', 'container', 'folder', 'image', 'title'].indexOf(obj.content.kind) != -1;
}

export function isCanvasArrowTarget(obj: CanvasObject): obj is CanvasObject<CanvasArrowTarget> {
    return ['text', 'container', 'folder', 'image', 'title'].indexOf(obj.content.kind) != -1;
}

export type CanvasText = CanvasObject<TextContent> & { content: TextContent & { kind: TextContent['kind'] } };
export type CanvasFolder = CanvasObject<FolderContent> & { content: CanvasContent & { kind: FolderContent['kind'] } };
export type CanvasContainer = CanvasObject<ContainerContent> & { content: CanvasContent & { kind: ContainerContent['kind'] } };

export function isCanvasText(obj: CanvasObject): obj is CanvasText {
    return obj.content.kind === 'text';
}

export function isCanvasTitle(obj: CanvasObject): obj is CanvasText {
    return obj.content.kind === 'title';
}

export function isCanvasFolder(obj: CanvasObject): obj is CanvasFolder {
    return obj.content.kind === 'folder';
}

export function isCanvasContainer(obj: CanvasObject): obj is CanvasContainer {
    return obj.content.kind === 'container';
}

export type CanvasParent = CanvasFolder | CanvasContainer;

export function isCanvasParent(obj: CanvasObject): obj is CanvasParent {
    return isCanvasFolder(obj) || isCanvasContainer(obj);
}

export type CanvasObjectSerializable = {
    id: number,
    position: Vec2,
    size: Size2,
    content: ContentSerializable,
    parentId: CanvasId | null,
    isRoot: boolean,
};
export class CanvasObject<T extends CanvasContent = CanvasContent> {
    constructor(
        public id: number,
        public position: Vec2,
        public size: Size2,
        public content: T,
        public parentId: CanvasId | null,
        public isRoot: boolean,
        public dragging: boolean = false,
        public resizing: boolean = false,
        public editing: boolean = false,
        public selected: boolean = false,
        public tentativeSelected: Vec2 | null = null,
        public tentativePosition: Vec2 | null = null,
        public tentativeSize: Size2 | null = null,
    ) { }

    getSerializable(): CanvasObjectSerializable {
        return {
            id: this.id,
            position: new Vec2(this.position.x, this.position.y),
            size: new Size2(this.size.w, this.size.h),
            content: this.content.getSerializable(),
            parentId: this.parentId,
            isRoot: this.isRoot,
        };
    }

    toHtmlText(global: Vec2|null, storageService: StorageService): string {

        global = global ?? this.position;

        let html = `
        <div 
            data-slate-kind="object"
            data-slate-id="${this.id}"
            data-slate-position-x="${global.x}" data-slate-position-y="${global.y}"
            data-slate-size-w="${this.size.w}" data-slate-size-h="${this.size.h}"
            data-slate-parent-id="${this.parentId}" data-slate-is-root="${this.isRoot}"
        >
        `;
        html += this.content.toHtmlText(storageService);
        html += '</div>';
        return html;
    }

    toText(): string {
        return this.content.toText();
    }

    static htmlToSerializable(el: Element, storageService: StorageService): CanvasObjectSerializable {
        if(el.getAttribute('data-slate-kind') !== 'object') {
            throw new Error('');
        }

        let posXAttr = el.getAttribute('data-slate-position-x');
        let posYAttr = el.getAttribute('data-slate-position-y');
        let sizeWAttr = el.getAttribute('data-slate-size-w');
        let sizeHAttr = el.getAttribute('data-slate-size-h');
        let idAttr = el.getAttribute('data-slate-id');
        let parentIdAttr = el.getAttribute('data-slate-parent-id');
        let isRootAttr = el.getAttribute('data-slate-is-root');

        if(
            !posXAttr ||
            !posYAttr ||
            !sizeWAttr ||
            !sizeHAttr ||
            !idAttr ||
            !parentIdAttr ||
            !isRootAttr
        ) {
                throw new Error('')
        }

        let posX = parseFloat(posXAttr);
        let posY = parseFloat(posYAttr);
        let sizeW = parseFloat(sizeWAttr);
        let sizeH = parseFloat(sizeHAttr);
        let id = parseInt(idAttr);
        let parentId = parseInt(parentIdAttr);
        let isRoot = isRootAttr === 'true';

        if(isNaN(posX) || isNaN(posY) || isNaN(sizeW) || isNaN(sizeH) || isNaN(id)) {
            throw new Error('');
        }

        if(el.children.length !== 1) {
            throw new Error('');
        }

        let content;
        let contentEl = el.querySelector('.content');
        if(!contentEl) throw new Error('');
        let contentKind = contentEl.getAttribute('data-slate-kind');
        if(contentKind === 'text') {
            content = TextContent.htmlToSerializable(contentEl);
        } else if(contentKind === 'container') {
            content = ContainerContent.htmlToSerializable(contentEl, storageService);
        } else if(contentKind === 'image') {
            content = ImageContent.htmlToSerializable(contentEl, storageService);
        } else if(contentKind === 'title') {
            content = TitleContent.htmlToSerializable(contentEl);
        } else if(contentKind === 'folder') {
            content = FolderContent.htmlToSerializable(contentEl);
        } else if(contentKind === 'arrow') {
            content = ArrowContent.htmlToSerializable(contentEl);
        } else {
            throw new Error(`missing implementation for kind ${contentKind}`);
        }

        return {
            id: id,
            parentId: parentId,
            position: new Vec2(posX, posY),
            size: new Size2(sizeW, sizeH),
            isRoot: isRoot,
            content: content,
        };
    }

    // Should only be called with T == TextContent|ArrowContent|etc; Never any subclass (or extensions) of these types,
    // as that would break the contract (the signature states the function returns any T it receives, but it only does so
    // for these specific types). This is still safe since the function checks for the kind before returning.
    static deserialize<T extends CanvasContent>(input: Partial<CanvasObjectSerializable>): CanvasObject<T> {
        if (
            ('id' in input && input.id !== undefined) &&
            ('position' in input && input.position !== undefined) &&
            ('size' in input && input.size !== undefined) &&
            ('content' in input && input.content !== undefined) &&
            ('parentId' in input && input.parentId !== undefined) &&
            ('isRoot' in input && input.isRoot !== undefined)
        ) {
            let content = input.content;
            let convertedContent;
            if (content.kind == 'text') {
                convertedContent = TextContent.deserialize(content);
            } else if (content.kind == 'arrow') {
                convertedContent = ArrowContent.deserialize(content);
            } else if (content.kind == 'container') {
                convertedContent = ContainerContent.deserialize(content);
            } else if (content.kind == 'folder') {
                convertedContent = FolderContent.deserialize(content);
            } else if (content.kind == 'image') {
                convertedContent = ImageContent.deserialize(content);
            } else if (content.kind == 'title') {
                convertedContent = TitleContent.deserialize(content);
            } else {
                //throw new Error('[CanvasObject::deserialize] Unknown kind: ' + input.content.kind);
                assertUnreachable(content);
            }

            if (!convertedContent) {
                throw new Error('[CanvasObject::deserialize] Error deserializing object: ' + JSON.stringify(input));
            }

            return new CanvasObject<T>(
                input.id,
                new Vec2(input.position.x, input.position.y),
                new Size2(input.size.w, input.size.h),
                convertedContent as T, // pinky promise 
                input.parentId,
                input.isRoot,
            )
        }
        throw new Error(`[deserialize error] input: ${JSON.stringify(input)}`)
    }

    // This function clones ids along with values, do not use it to clone objects already in the canvasStore
    unsafeClone(): CanvasObject<T> {
        let clone;
        try {
            clone = CanvasObject.deserialize<T>(this.getSerializable());
        } catch (e) {
            throw new Error(`[CanvasObject::unsafeClone] cannot clone object: ${this.id} | ${e}`);
        }
        return clone;
    }
}