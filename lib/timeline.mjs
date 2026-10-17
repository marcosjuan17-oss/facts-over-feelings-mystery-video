// Shared timing for the 1080×1920 daily video. Kept under 25 seconds so the
// Short still loops, with a reveal beat between the guess and the site CTA.
export const FPS = 30;
export const DURATION = 24.5;
export const TIMELINE = {
  hookEnd: 1.4,
  clueStarts: [1.4, 5.3, 9.2],
  lockStart: 13.1,
  revealStart: 14.6,
  ctaStart: 18.8,
  loopStart: 22.9,
};
