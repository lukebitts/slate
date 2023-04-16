import {Pipe, PipeTransform} from "@angular/core";
import { CurveInfo } from "src/app/canvas/canvas.model";
import { distanceBetweenPoints, getCurvePoints, Vec2 } from "../math";


type XPT = {point: Vec2, dist: number, angle: number};

@Pipe({"name": "curvePoints"})
export class CurvePointsPipe implements PipeTransform {

    constructor() {}

    transform (curve: CurveInfo): XPT[] {

        let curveLen = distanceBetweenPoints(new Vec2(curve.c1x, curve.c1y), new Vec2(curve.c2x, curve.c2y));

        const COUNT = curveLen < 700 ? 6 : (curveLen < 900 ? 8 : 12);

        let points = getCurvePoints(curve, COUNT);

        let ret: XPT[]  = []

        for(let i = 0; i < points.length-1; i++) {
            let win1 = points[i][0];
            let win2 = points[i+1][0];

            let mid = new Vec2((win1.x + win2.x) / 2, (win1.y + win2.y) / 2);
            let dist = distanceBetweenPoints(win1, win2);
            
            let angle1 = points[i][1];
            let angle2 = points[i+1][1];
            let meanAngle = Math.atan2(Math.sin(angle1) + Math.sin(angle2), Math.cos(angle1) + Math.cos(angle2));

            ret.push({point: mid, dist: dist, angle: meanAngle});
        }
        return ret;

        /*let points = getCurvePoints(curve, COUNT);
        let length = 0;
        let distances: number[] = [];
        for(let i = 0; i < COUNT; i++) {
            let distance = distanceBetweenPoints(points[i][0], points[i+1][0]);
            //if(distance > length) {
                length += distance;
                distances.push(distance);
            //}
        }
        distances.push(distanceBetweenPoints(points[COUNT-1][0], points[COUNT][0]));

        let doublePoints = getCurvePoints(curve, COUNT*4);
        points[0] = doublePoints[1];
        points[COUNT] = doublePoints[COUNT*4-1];

        distances[0] = distanceBetweenPoints(doublePoints[0][0], doublePoints[1][0]);
        distances[COUNT] = distanceBetweenPoints(doublePoints[COUNT*4-1][0], doublePoints[COUNT*4][0]);

        return points.map((p,idx) => ({point: p[0], angle: p[1], dist:distances[idx]/ (idx==0||idx==COUNT?0.5:1) }));*/
    }

}
