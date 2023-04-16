import { Size2, Vec2 } from "../common/math";
import { ArrowContent, ArrowSerializable, CanvasObject, idRef, TextContent } from "./canvas.model";

describe('Canvas Model', () => {
    it('Object serializable should clone pos and size parameters', () => {
        let pos = new Vec2(10, 10);
        let size = new Size2(10, 10);
        let obj = new CanvasObject(1, pos, size, new TextContent(''), null, true);
        
        let serializable = obj.getSerializable();

        pos.x = 20;
        pos.y = 30;
        size.w = 30;
        size.h = 20;

        expect(serializable.position.x).not.toEqual(pos.x);
        expect(serializable.position.y).not.toEqual(pos.y);
        expect(serializable.size.w).not.toEqual(size.w);
        expect(serializable.size.h).not.toEqual(size.h);

        let objdes = CanvasObject.deserialize(serializable);

        serializable.position.x = 5;
        serializable.position.y = 4;
        serializable.size.w = 3;
        serializable.size.h = 2;

        expect(objdes.position.x).not.toEqual(serializable.position.x);
        expect(objdes.position.y).not.toEqual(serializable.position.y);
        expect(objdes.size.w).not.toEqual(serializable.size.w);
        expect(objdes.size.h).not.toEqual(serializable.size.h);
    });

    it('Arrow serializable should clone curve parameter', () => {
        let pos = new Vec2(10, 10);
        let size = new Size2(10, 10);
        let curve = {
            sx: 10,
            sy: 10,
            c1x: 10,
            c1y: 10,
            c2x: 10,
            c2y: 10,
            ex: 10,
            ey: 10,
            ae: 10,
            as: 10,
        };
        let obj = new CanvasObject(1, pos, size, new ArrowContent(idRef(0), idRef(0), curve, false, false), null, true);
        
        let serializable = obj.getSerializable();

        curve.sx = 20;

        expect((serializable.content as ArrowSerializable).curve!.sx).toEqual(10);
    });
});

describe("getBoundingBox", () => {
    it("should return the correct bounding box for a simple curve", () => {
        const curve = { sx: 1, sy: 2, c1x: 3, c1y: 4, c2x: 5, c2y: 6, ex: 7, ey: 8, ae: 0, as: 0 };
        const thickness = 2;
        const [vec2, size2] = ArrowContent.getBoundingBox(curve, thickness);
        expect(vec2).toEqual(new Vec2(-1, 0));
        expect(size2).toEqual(new Size2(10, 10));
    });

    it("should return the correct bounding box for a complex curve", () => {
        const curve = { sx: 10, sy: 20, c1x: 30, c1y: 40, c2x: 50, c2y: 60, ex: 70, ey: 80, ae: 0, as: 0 };
        const thickness = 5;
        const [vec2, size2] = ArrowContent.getBoundingBox(curve, thickness);
        expect(vec2).toEqual(new Vec2(5, 15));
        expect(size2).toEqual(new Size2(70, 70));
    });

    it("should return the correct bounding box for a curve with negative coordinates", () => {
        const curve = { sx: -10, sy: -20, c1x: -30, c1y: -40, c2x: -50, c2y: -60, ex: -70, ey: -80, ae: 0, as: 0 };
        const thickness = 8;
        const [vec2, size2] = ArrowContent.getBoundingBox(curve, thickness);
        expect(vec2).toEqual(new Vec2(-78, -88));
        expect(size2).toEqual(new Size2(76, 76));
    });

    it("should return the correct bounding box for a curve with all points at the same coordinates", () => {
        const curve = { sx: 5, sy: 5, c1x: 5, c1y: 5, c2x: 5, c2y: 5, ex: 5, ey: 5, ae: 0, as: 0 };
        const thickness = 2;
        const [vec2, size2] = ArrowContent.getBoundingBox(curve, thickness);
        expect(vec2).toEqual(new Vec2(3, 3));
        expect(size2).toEqual(new Size2(4, 4));
    });
});