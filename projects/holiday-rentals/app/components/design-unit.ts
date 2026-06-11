// Design unit for cross-aspect scaling. The compositions are authored for 4:5;
// at taller aspects (e.g. 9:16) this caps growth on the width axis so type and
// chips don't balloon, and at 1:1 it keeps them from getting too large for the
// stubbier canvas. Tuned so a chip or headline reads the same physical size
// across every resolution in `effing.config.ts`.
export function designUnit(width: number, height: number): number {
  return Math.min(width, (height * 4) / 5);
}
