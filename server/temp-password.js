import crypto from "node:crypto";
/* Studio's own (its server/temp-password.js), copied as it is. */

/**
 * A temporary password somebody can read off an email and type on a phone
 * (Glenn, 27 Sep): a color, a fruit, then three digits and symbols —
 * "tealmango4#7". It only has to last until they choose their own, which the
 * app makes them do before anything else, so easy to type beats long; ten
 * characters of hex was accurate and miserable on a phone keyboard.
 *
 * All lowercase words, and symbols that sit on the first symbol page of a
 * phone keyboard. At least one digit and one symbol in the three, in any order.
 */
const COLORS = ["red", "blue", "green", "pink", "gold", "teal", "purple", "coral", "amber", "violet"];
const FRUITS = [
  "apple", "banana", "cherry", "grape", "lemon", "lime", "mango", "melon", "peach", "pear",
  "plum", "kiwi", "berry", "orange", "papaya", "guava", "fig", "apricot", "lychee", "coconut",
];
const DIGITS = "23456789";          // no 0 or 1, which read as O and l
const SYMBOLS = "!@#$%&*?";

const pick = (s) => s[crypto.randomInt(s.length)];

export function tempPassword() {
  const tail = [pick(DIGITS), pick(SYMBOLS), pick(DIGITS + SYMBOLS)];
  for (let i = tail.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [tail[i], tail[j]] = [tail[j], tail[i]];
  }
  return `${pick(COLORS)}${pick(FRUITS)}${tail.join("")}`;
}

export const TEMP_PASSWORD_WORDS = { COLORS, FRUITS };
