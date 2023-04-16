import { CurveInfo } from "../canvas/canvas.model";

export class Vec2 {
    constructor(public x: number, public y: number) { }

    static z() {
        return new Vec2(0, 0);
    }

    clone(): Vec2 {
        return new Vec2(this.x, this.y);
    }
}

export class Size2 {
    constructor(public w: number, public h: number) { }

    static z() {
        return new Size2(0, 0);
    }

    clone(): Size2 {
        return new Size2(this.w, this.h);
    }
}

export function uuid(size:number = 10) {
    const MASK = 0x3d
    const LETTERS = 'abcdefghijklmnopqrstuvwxyz'
    const NUMBERS = '1234567890'
    const charset = `${NUMBERS}${LETTERS}${LETTERS.toUpperCase()}_-`.split('')

    const bytes = new Uint8Array(size)
    crypto.getRandomValues(bytes)

    return bytes.reduce((acc, byte) => `${acc}${charset[byte & MASK]}`, '')
}

export function getCurvePoints(curve: CurveInfo, numPoints: number = 100): [Vec2, number][] {
    const curvePoints: [Vec2, number][] = [];
    for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const x =
            (1 - t) * (1 - t) * (1 - t) * curve.sx +
            3 * (1 - t) * (1 - t) * t * curve.c1x +
            3 * (1 - t) * t * t * curve.c2x +
            t * t * t * curve.ex;
        const y =
            (1 - t) * (1 - t) * (1 - t) * curve.sy +
            3 * (1 - t) * (1 - t) * t * curve.c1y +
            3 * (1 - t) * t * t * curve.c2y +
            t * t * t * curve.ey;
        const dx =
            3 * (1 - t) * (1 - t) * (curve.c1x - curve.sx) +
            6 * (1 - t) * t * (curve.c2x - curve.c1x) +
            3 * t * t * (curve.ex - curve.c2x);
        const dy =
            3 * (1 - t) * (1 - t) * (curve.c1y - curve.sy) +
            6 * (1 - t) * t * (curve.c2y - curve.c1y) +
            3 * t * t * (curve.ey - curve.c2y);
        const angle = Math.atan2(dy, dx);
        curvePoints.push([new Vec2(x, y), angle]);
    }
    return curvePoints;
}

export function distanceBetweenPoints(p1: Vec2, p2: Vec2): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}