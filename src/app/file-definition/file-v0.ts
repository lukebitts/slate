/*
import { doesKeysExist } from "../common/parser";

export interface Vec2V0 {
    x: number;
    y: number;
}

export interface Size2V0 {
    w: number;
    h: number;
}

export interface TextContentV0 {
    kind: 'text';
    text: string;
}

export interface ImageContentV0 {
    kind: 'image';
    src: string;
    blob: string | null;
}

export interface ContainerContentV0 {
    kind: 'container';
    title: string;
    objects: ObjectV0[];
}

export interface SlateContentV0 {
    kind: 'slate';
    title: string;
    color: string;
    objects: ObjectV0[];
}

export interface ArrowV0 {
    id: number;
    start: ObjectV0;
    end: ObjectV0 | Vec2V0;
    selected: boolean;
    rootId: number | null;
}

export type ContentV0 = TextContentV0 | ImageContentV0 | ContainerContentV0 | SlateContentV0;

export interface ObjectV0 {
    id: number;
    position: Vec2V0;
    size: Size2V0;
    dragging: boolean;
    resizing: boolean;
    editing: boolean;
    selected: boolean;
    content: ContentV0;
    parent: number | null;
    originalPosition: Vec2V0 | null;
    originalSize: Size2V0 | null;
}

export interface V0 {
    arrowCounter: number;
    objCounter: number;
    parserId: string;
    sarrows: any[];
    sids: number[];
    sobjs: ObjectV0[];
}

export class ParserV0 {
    static hasArrowCounter(data: unknown): data is { arrowCounter: number } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'arrowCounter') && typeof data.arrowCounter === 'number');
        return has;
    }
    static hasObjCounter(data: unknown): data is { objCounter: number } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'objCounter') && typeof data.objCounter === 'number');
        return has;
    }
    static hasParserId(data: unknown): data is { parserId: string } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'parserId') && typeof data.parserId === 'string');
        return has;
    }
    static hasSarrows(data: unknown): data is { sarrows: string } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'sarrows') && typeof data.sarrows === 'string');
        return has;
    }
    static hasSids(data: unknown): data is { sids: string } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'sids') && typeof data.sids === 'string');
        return has;
    }
    static hasSobjs(data: unknown): data is { sobjs: string } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'sobjs') && typeof data.sobjs === 'string');
        return has;
    }
    static hasId(data: unknown): data is { id: number } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'id') && typeof data.id === 'number');
        return has;
    }
    static hasStart(data: unknown): data is { start: ObjectV0 } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'start') && typeof data.start === 'object' && ParserV0.isObjectV0(data.start));
        return has;
    }
    static hasEnd(data: unknown): data is { end: ObjectV0|Vec2V0 } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'end') && typeof data.end === 'object' && (ParserV0.isObjectV0(data.end) || ParserV0.isVec2(data.end)));
        return has;
    }
    static hasSelected(data: unknown): data is { selected: boolean } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'selected') && typeof data.selected === 'boolean');
        return has;
    }
    static hasRootId(data: unknown): data is { rootId: number|null } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'rootId') && (typeof data.rootId === 'number' || data.rootId === null));
        return has;
    }
    static hasPosition(data: unknown): data is { position: Vec2V0 } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'position') && ParserV0.isVec2(data.position));
        return has;
    }
    static hasSize(data: unknown): data is { size: Size2V0 } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'size') && ParserV0.isSize2(data.size));
        return has;
    }
    static hasDragging(data: unknown): data is { dragging: boolean } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'dragging') && typeof data.dragging == 'boolean');
        return has;
    }
    static hasResizing(data: unknown): data is { resizing: boolean } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'resizing') && typeof data.resizing == 'boolean');
        return has;
    }
    static hasEditing(data: unknown): data is { editing: boolean } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'editing') && typeof data.editing == 'boolean');
        return has;
    }
    static hasContent(data: unknown): data is { content: ContentV0 } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'content') && typeof data.content == 'object' && ParserV0.isContentV0(data.content));
        return has;
    }
    static hasParent(data: unknown): data is { parent: number|null } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'parent') && (typeof data.parent == 'number' || data.parent === null));
        return has;
    }
    static hasOriginalPosition(data: unknown): data is { originalPosition: Vec2V0 } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'originalPosition') && ParserV0.isVec2(data.originalPosition));
        return has;
    }
    static hasOriginalSize(data: unknown): data is { originalSize: Size2V0 } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'originalSize') && ParserV0.isSize2(data.originalSize));
        return has;
    }
    static hasKind(data: unknown): data is { kind: string } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'kind') && typeof data.kind == 'string');
        return has;
    }
    static hasSrc(data: unknown): data is { src: string } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'src') && typeof data.src == 'string');
        return has;
    }
    static hasBlob(data: unknown): data is { blob: string|null } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'blob') && (typeof data.blob == 'object' || data.blob == null));
        return has;
    }
    static hasText(data: unknown): data is { text: string } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'text') && typeof data.text == 'string');
        return has;
    }
    static hasTitle(data: unknown): data is { title: string } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'title') && typeof data.title == 'string');
        return has;
    }
    static hasObjects(data: unknown): data is { objects: Array<ObjectV0> } {
        const isArray = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'objects') && Array.isArray(data.objects));
        if(!isArray) return false;
        if((data as Array<unknown>).length === 0) return true;
        let areMembersObjects = (data as {objects: Array<unknown>}).objects.every(o => ParserV0.isObjectV0(o));
        return areMembersObjects;
    }
    static hasColor(data: unknown): data is { color: string } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'color') && typeof data.color == 'string');
        return has;
    }
    static isVec2(data: unknown): data is Vec2V0 {
        const hasX = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'x') && typeof data.x === 'number');
        const hasY = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'y') && typeof data.y === 'number');
        return hasX && hasY;
    }
    static isSize2(data: unknown): data is Size2V0 {
        const hasW = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'w') && typeof data.w === 'number');
        const hasH = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'h') && typeof data.h === 'number');
        return hasW && hasH;
    }
    static isTextContentV0(data: unknown): data is TextContentV0 {
        const hasKind = ParserV0.hasKind(data) && data.kind === 'text';
        const hasText = ParserV0.hasText(data);
        return hasKind && hasText;
    }
    static isImageContentV0(data: unknown): data is ImageContentV0 {
        const hasKind = ParserV0.hasKind(data) && data.kind === 'image';
        const hasSrc = ParserV0.hasSrc(data);
        const hasBlob = ParserV0.hasBlob(data);
        return hasKind && hasSrc;
    }
    static isContainerContentV0(data: unknown): data is ContainerContentV0 {
        const hasKind = ParserV0.hasKind(data) && data.kind === 'container';
        const hasTitle = ParserV0.hasTitle(data);
        const hasObjects = ParserV0.hasObjects(data);
        return hasKind && hasTitle && hasObjects;
    }
    static isSlateContentV0(data: unknown): data is SlateContentV0 {
        const hasKind = ParserV0.hasKind(data) && data.kind === 'slate';
        const hasTitle = ParserV0.hasTitle(data);
        const hasObjects = ParserV0.hasObjects(data);
        return hasKind && hasTitle && hasObjects;
    }
    static isContentV0(data: unknown): data is ContentV0 {
        return ParserV0.isTextContentV0(data)
            || ParserV0.isImageContentV0(data)
            || ParserV0.isContainerContentV0(data)
            || ParserV0.isSlateContentV0(data);
    }
    static isObjectV0(data: unknown): data is ObjectV0 {
        const is = ParserV0.hasId(data)
            && ParserV0.hasPosition(data)
            && ParserV0.hasSize(data)
            && ParserV0.hasDragging(data)
            && ParserV0.hasResizing(data)
            && ParserV0.hasEditing(data)
            && ParserV0.hasSelected(data)
            && ParserV0.hasContent(data)
            && ParserV0.hasParent(data)
            && ParserV0.hasOriginalPosition(data)
            && ParserV0.hasOriginalSize(data);

        return is;
    }
}

export class FileV0 {

    version = 0 as const;

    static fromObject(parsed: unknown): V0 {
        //let parsed: unknown = JSON.parse(str);

        if (!ParserV0.hasArrowCounter(parsed)) throw new Error('arrowCounter');
        if (!ParserV0.hasObjCounter(parsed)) throw new Error('objCounter');
        if (!ParserV0.hasParserId(parsed)) throw new Error('parserId');
        if (!ParserV0.hasSarrows(parsed)) throw new Error('sarrows');
        if (!ParserV0.hasSids(parsed)) throw new Error('sids');
        if (!ParserV0.hasSobjs(parsed)) throw new Error('sobjs');

        let sarrowsParsed: unknown = JSON.parse(parsed.sarrows);
        if (typeof sarrowsParsed !== 'object' || !Array.isArray(sarrowsParsed)) throw new Error('invalid sarrows');

        let sarrows: ArrowV0[] = [];

        for (const parsedArrow of sarrowsParsed) {
            if (!ParserV0.hasId(parsedArrow)) throw new Error('arrow id');
            if (!ParserV0.hasStart(parsedArrow)) throw new Error('arrow start');
            if (!ParserV0.hasEnd(parsedArrow)) throw new Error('arrow end');
            if (!ParserV0.hasSelected(parsedArrow)) throw new Error('arrow selected');
            if(!ParserV0.hasRootId(parsedArrow)) throw new Error('arrow rootId');

            sarrows.push(parsedArrow);
        }

        let sidsParsed = JSON.parse(parsed.sids);
        if (typeof sidsParsed !== 'object' || !Array.isArray(sidsParsed)) throw new Error('invalid sids');
        if (sidsParsed.some(i => typeof i !== 'number')) throw new Error('non numerical ids');

        let sids = sidsParsed;

        let sobjsParsed: unknown[] = JSON.parse(parsed.sobjs);
        if(typeof sobjsParsed !== 'object') throw new Error('invalid sobjs');

        let sobjs: ObjectV0[] = [];
        
        for(const [parsedId, parsedObj] of Object.entries(sobjsParsed)) {
            if(!ParserV0.isObjectV0(parsedObj)) throw new Error('invalid object');

            sobjs.push(parsedObj);
        }

        return {
            ...parsed,
            sids,
            sobjs,
            sarrows
        }
    }
}*/