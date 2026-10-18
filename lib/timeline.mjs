// Shared timing for the 1080×1920 daily video.
// Each clue is 3.7s, the slot from before the 5.8s stretch
// (1.4→5.1, 5.1→8.8, 8.8→12.5). The ending is only the name,
// then the site line, then a hard cut back to the opening frame.
export const FPS = 30;
export const DURATION = 20.7;
export const TIMELINE = {
  hookEnd: 3,
  clueStarts: [3, 6.7, 10.4],
  thinkStart: 14.1,
  nameStart: 15.7,
  ctaStart: 17.7,
  loopStart: 20.3,
};
