import { CanvasObjectSerializable } from "../canvas/canvas.model";
import { Size2, uuid, Vec2 } from "../common/math";
import { doesKeysExist } from "../common/parser";
//import { ContentV0, ParserV1, Size2V0, TextContentV0, Vec2V0 } from "./file-v0";

export type Vec2V1 = {
    x: number;
    y: number;
};

export type Size2V1 = {
    w: number;
    h: number;
};

export type TextContentV1 = {
    kind: 'text';
    text: string;
};

export type TitleContentV1 = {
    kind: 'title';
    text: string;
};

export interface ImageContentV1 {
    kind: 'image';
    handle: string;
}

export interface ContainerContentV1 {
    kind: 'container';
    title: string;
    objects: ObjectV1[];
}

export interface FolderContentV1 {
    kind: 'folder';
    name: string;
    color: string;
    icon: string;
    objects: ObjectV1[];
}

export type CurveInfoV1 = {
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

export interface ArrowContentV1 {
    kind: 'arrow';
    start: number;
    end: number;
    curve: CurveInfoV1;
    tipLeft: boolean;
    tipRight: boolean;
}

export type ContentV1 = TitleContentV1 | TextContentV1 | ImageContentV1 | ContainerContentV1 | FolderContentV1 | ArrowContentV1;

export interface ObjectV1 {
    id: number;
    position: Vec2V1;
    size: Size2V1;
    content: ContentV1;
    parentId: number | null;
    isRoot: boolean,
    //dragging: boolean;
    //resizing: boolean;
    //editing: boolean;
    //selected: boolean;
    //tentativeSelected: Vec2V1 | null;
    //tentativePosition: Vec2V1 | null;
    //tentativeSize: Size2V1 | null;
}

export interface V1 {
    version: 1;
    uuid: string;
    lastAccess: string;
    name: string;
    data: {
        lastObjectId: number;
        data: ObjectV1;
    } | null;
}

export class ParserV1 {
    static hasVersion(data: unknown): data is { version: number } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'version') && typeof data.version === 'number');
        return has;
    }
    static hasName(data: unknown): data is { name: string } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'name') && typeof data.name === 'string');
        return has;
    }
    static hasIcon(data: unknown): data is { icon: string } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'icon') && typeof data.icon === 'string');
        return has;
    }
    static hasHandle(data: unknown): data is { handle: string } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'handle') && typeof data.handle === 'string');
        return has;
    }
    static hasUuid(data: unknown): data is { uuid: string } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'uuid') && typeof data.uuid === 'string');
        return has;
    }
    static hasLastAccess(data: unknown): data is { lastAccess: string } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'lastAccess') && typeof data.lastAccess === 'string');
        return has;
    }
    static hasData(data: unknown): data is { data: object|null } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'data') && (data.data === null || typeof data.data === 'object'));
        return has;
    }
    static hasParentId(data: unknown): data is { parentId: number|null } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'parentId') && (typeof data.parentId === 'number' || data.parentId === null));
        return has;
    }
    static hasIsRoot(data: unknown): data is { isRoot: boolean } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'isRoot') && typeof data.isRoot === 'boolean');
        return has;
    }
    static hasTentativeSelected(data: unknown): data is { tentativeSelected: Vec2V1 } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'tentativeSelected') && ParserV1.isVec2(data.tentativeSelected));
        return has;
    }
    static hasTentativePosition(data: unknown): data is { tentativePosition: Vec2V1 } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'tentativePosition') && ParserV1.isVec2(data.tentativePosition));
        return has;
    }
    static hasTentativeSize(data: unknown): data is { tentativeSize: Vec2V1 } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'tentativeSize') && ParserV1.isSize2(data.tentativeSize));
        return has;
    }
    static hasObjectData(data: unknown): data is { data: ObjectV1 } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'data') && (typeof data.data === 'object' && ParserV1.isObjectV1(data.data)));
        return has;
    }
    static hasLastObjectId(data: unknown): data is { lastObjectId: number } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'lastObjectId') && typeof data.lastObjectId === 'number');
        return has;
    }
    static hasContent(data: unknown): data is { content: ContentV1 } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'content') && typeof data.content === 'object' && ParserV1.isContentV1(data.content));
        return has;
    }
    static hasStart(data: unknown): data is { start: number } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'start') && typeof data.start === 'number');
        return has;
    }
    static hasEnd(data: unknown): data is { end: number } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'end') && typeof data.end === 'number');
        return has;
    }
    static hasCurve(data: unknown): data is { curve: CurveInfoV1 } {
        if((typeof data === 'object') && data != null && doesKeysExist(data, 'curve')) {
            let curve = data.curve;
            
            if(typeof curve !== 'object') return false;
            if(curve == null) return true;
            
            const hassx = Boolean(doesKeysExist(curve, 'sx') && typeof curve.sx === 'number');
            const hassy = Boolean(doesKeysExist(curve, 'sy') && typeof curve.sy === 'number');
            const hasc1x = Boolean(doesKeysExist(curve, 'c1x') && typeof curve.c1x === 'number');
            const hasc1y = Boolean(doesKeysExist(curve, 'c1y') && typeof curve.c1y === 'number');
            const hasc2x = Boolean(doesKeysExist(curve, 'c2x') && typeof curve.c2x === 'number');
            const hasc2y = Boolean(doesKeysExist(curve, 'c2y') && typeof curve.c2y === 'number');
            const hasex = Boolean(doesKeysExist(curve, 'ex') && typeof curve.ex === 'number');
            const hasey = Boolean(doesKeysExist(curve, 'ey') && typeof curve.ey === 'number');
            const hasae = Boolean(doesKeysExist(curve, 'ae') && typeof curve.ae === 'number');
            const hasas = Boolean(doesKeysExist(curve, 'as') && typeof curve.as === 'number');

            return hassx && hassy && hasc1x && hasc1y && hasc2x && hasc2y && hasex && hasey && hasae && hasas;
        }
        return false;
    }
    static hasObjects(data: unknown): data is { objects: Array<ObjectV1> } {
        const isArray = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'objects') && Array.isArray(data.objects));
        if(!isArray) return false;
        if((data as Array<unknown>).length === 0) return true;
        let areMembersObjects = (data as {objects: Array<unknown>}).objects.every(o => ParserV1.isObjectV1(o));
        return areMembersObjects;
    }
    static hasKind(data: unknown): data is { kind: string } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'kind') && typeof data.kind == 'string');
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
    static hasPosition(data: unknown): data is { position: Vec2V1 } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'position') && ParserV1.isVec2(data.position));
        return has;
    }
    static hasSize(data: unknown): data is { size: Size2V1 } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'size') && ParserV1.isSize2(data.size));
        return has;
    }
    static hasId(data: unknown): data is { id: number } {
        const has = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'id') && typeof data.id === 'number');
        return has;
    }
    static isVec2(data: unknown): data is Vec2V1 {
        const hasX = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'x') && typeof data.x === 'number');
        const hasY = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'y') && typeof data.y === 'number');
        return hasX && hasY;
    }
    static isSize2(data: unknown): data is Size2V1 {
        const hasW = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'w') && typeof data.w === 'number');
        const hasH = Boolean((typeof data === 'object') && data != null && doesKeysExist(data, 'h') && typeof data.h === 'number');
        return hasW && hasH;
    }
    static isImageContentV1(data: unknown): data is ImageContentV1 {
        const hasKind = ParserV1.hasKind(data) && data.kind === 'image';
        const hasHandle = ParserV1.hasHandle(data);
        return hasKind && hasHandle;
    }
    static isTextContentV1(data: unknown): data is TextContentV1 {
        const hasKind = ParserV1.hasKind(data) && data.kind === 'text';
        const hasText = ParserV1.hasText(data);
        return hasKind && hasText;
    }
    static isTitleContentV1(data: unknown): data is TitleContentV1 {
        const hasKind = ParserV1.hasKind(data) && data.kind === 'title';
        const hasText = ParserV1.hasText(data);
        return hasKind && hasText;
    }
    static isContainerContentV1(data: unknown): data is ContainerContentV1 {
        const hasKind = ParserV1.hasKind(data) && data.kind === 'container';
        const hasTitle = ParserV1.hasTitle(data);
        const hasObjects = ParserV1.hasObjects(data);
        return hasKind && hasTitle && hasObjects;
    }
    static isFolderContentV1(data: unknown): data is FolderContentV1 {
        const hasKind = ParserV1.hasKind(data) && data.kind === 'folder';
        const hasName = ParserV1.hasName(data);
        const hasIcon = ParserV1.hasIcon(data);
        const hasObjects = ParserV1.hasObjects(data);
        return hasKind && hasName && hasIcon && hasObjects;
    }
    static isArrowContentV1(data: unknown): data is ArrowContentV1 {
        const hasKind = ParserV1.hasKind(data) && data.kind === 'arrow';
        const hasStart = ParserV1.hasStart(data);
        const hasEnd = ParserV1.hasEnd(data);
        const hasCurve = ParserV1.hasCurve(data);

        return hasKind && hasStart && hasEnd && hasCurve;
    }
    static isContentV1(data: unknown): data is ContentV1 {
        const is1 = ParserV1.isTextContentV1(data)
        const is2 = ParserV1.isImageContentV1(data)
        const is3 = ParserV1.isContainerContentV1(data)
        const is4 = ParserV1.isFolderContentV1(data);
        const is5 = ParserV1.isArrowContentV1(data);
        const is6 = ParserV1.isTitleContentV1(data);

        return is1 || is2 || is3 || is4 || is5 || is6;
    }
    static isObjectV1(data: unknown): data is ObjectV1 {
        const is = ParserV1.hasId(data)
        const is2 = ParserV1.hasPosition(data)
        const is3 = ParserV1.hasSize(data)
        const is4 = ParserV1.hasContent(data)
        const is5 = ParserV1.hasParentId(data)
        const is6 = ParserV1.hasIsRoot(data);

        return is && is2 && is3 && is4 && is5 && is6;
    }
}

export class FileV1 {
    version = 1  as const;

    static fromModel(objv1: CanvasObjectSerializable): ObjectV1 {
        let content: ContentV1;
        if(objv1.content.kind === 'text') {
            content = objv1.content;
        } else if(objv1.content.kind === 'title') {
            content = objv1.content;
        } else if(objv1.content.kind === 'arrow') {
            if(objv1.content.curve) {
                content = {
                    kind: 'arrow',
                    start: objv1.content.start,
                    end: objv1.content.end,
                    curve: objv1.content.curve,
                    tipLeft: objv1.content.tipLeft,
                    tipRight: objv1.content.tipRight,
                };
            } else {
                throw new Error('missing curve');
            }
        } else if(objv1.content.kind === 'image') {
            content = objv1.content;
        } else if(objv1.content.kind === 'container') {
            const objs = objv1.content.objects.map(o => FileV1.fromModel(o));
            content = {
                ...objv1.content,
                objects: objs
            };
        } else if(objv1.content.kind === 'folder') {
            const objs = objv1.content.objects.map(o => FileV1.fromModel(o));
            content = {
                ...objv1.content,
                objects: objs
            };
        } else {
            throw new Error(`invalid kind ${objv1.content}`);
        }

        let obj: ObjectV1 = {
            id: objv1.id,
            position: new Vec2(objv1.position.x, objv1.position.y),
            size: new Size2(objv1.size.w, objv1.size.h),
            content: content,
            parentId: objv1.parentId,
            isRoot: objv1.isRoot,
        };
        return obj;
    }

    static fromObject(parsed: unknown): V1 {

        if(!ParserV1.hasVersion(parsed) || parsed.version !== 1) throw new Error('version');
        if(!ParserV1.hasData(parsed)) throw new Error('data');
        if(!ParserV1.hasUuid(parsed)) throw new Error('uuid');
        if(!ParserV1.hasLastAccess(parsed)) throw new Error('lastAccess');
        if(!ParserV1.hasName(parsed)) throw new Error('name');

        let innerData = null;
        if(parsed.data) {
            let parsedData: object = parsed.data;
            if(!ParserV1.hasObjectData(parsedData)) throw new Error('object data');
            if(!ParserV1.hasLastObjectId(parsedData)) throw new Error('object last object id');

            innerData = parsedData;
        }

        return {
            ...parsed,
            version: 1,
            data: innerData ?? null,
        };
    }

    static default(): V1 {
        return {
            version: 1,
            data: null,
            uuid: uuid(),
            lastAccess: '',
            name: 'Untitled',
            //lastObjectId: 0,
        };
    }
}