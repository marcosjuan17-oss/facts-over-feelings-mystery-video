// Shared timing for the 1080×1920 daily video.
// Each clue stays up long enough to read. The ending is only the name,
// then the site line, then a hard cut back to the opening frame.
export const FPS = 30;
export const DURATION = 27;
export const TIMELINE = {
  hookEnd: 3,
  clueStarts: [3, 8.8, 14.6],
  thinkStart: 20.4,
  nameStart: 22,
  ctaStart: 24,
  loopStart: 26.6,
};
