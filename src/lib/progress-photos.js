/**
 * Progress photos (Glenn, 19 Oct 2026: "Part of the measurements, let's add
 * progress photos as well. Pictures from front, sides and back side"): the
 * four angles, in the order they are taken, and the setup that makes one
 * day's photos comparable with the next. Shared by the page and the server.
 */

export const ANGLES = [
  { key: "front", label: "Front", say: "Facing the camera" },
  { key: "left", label: "Left side", say: "Left side to the camera" },
  { key: "right", label: "Right side", say: "Right side to the camera" },
  { key: "back", label: "Back", say: "Back to the camera" },
];
export const ANGLE_KEYS = ANGLES.map(a => a.key);
export const angleLabel = (key) => ANGLES.find(a => a.key === key)?.label || key;

/* Shown before the first photo of each set ("Checklist and steps"). */
export const CHECKLIST = [
  "The same spot each time, with a plain wall behind and even light, not a window behind them.",
  "The camera about 3 m (10 ft) away and at hip height, on a stand or a shelf if you can.",
  "The same clothes each time, fitted, so the shape shows.",
  "Standing tall and relaxed, feet hip-width apart, arms a little away from the sides.",
  "The same time of day, ideally with their measurements.",
];

/* The photos are 3:4, upright, at most this size; shrunk in the browser. */
export const PHOTO_W = 1200;
export const PHOTO_H = 1600;
export const PHOTO_MAX_BYTES = 3 * 1024 * 1024;
