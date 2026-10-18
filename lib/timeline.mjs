// Shared timing for the 1080×1920 daily video. One end card holds the name
// and the site line, then the picture fades back into the hook. Under 25s.
export const FPS = 30;
export const DURATION = 24;
export const TIMELINE = {
  hookEnd: 1.4,
  clueStarts: [1.4, 5.1, 8.8],
  lockStart: 12.5,
  endStart: 14.1,
  loopStart: 22.4,
};
