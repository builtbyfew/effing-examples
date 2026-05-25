// Design unit for cross-aspect scaling. The composition is authored for 9:16;
// at shorter aspects (e.g. 4:5) this returns a smaller value so foreground
// elements shrink in step instead of leaving 9:16-sized type on a stubby
// canvas. The 10/16 factor leaves enough air at 4:5 without making elements
// feel tiny.
export function designUnit(width: number, height: number): number {
  return Math.min(width, (height * 10) / 16);
}
