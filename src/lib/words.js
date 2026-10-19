/*
 * Small pieces of English shared by the pages and the server (Run 1, B-15).
 */

/** "a" or "an", by the sound of the word's first letter: "an upper body day". */
export const aOrAn = (word) => (/^([aeiou]|8|1[18](?!\d))/i.test(String(word).trim()) ? "an" : "a");

/** "squats, lunges and rows". */
export const andList = (list) => (list.length > 1 ? `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}` : list[0] || "");

/** "1 rep", "3 reps". */
export const plural = (n, word, many = `${word}s`) => `${n} ${Number(n) === 1 ? word : many}`;

/** A label inside a sentence: its first letter small, the rest as written,
    so "A suspension trainer (TRX)" reads "a suspension trainer (TRX)". */
export const lowerFirst = (s) => String(s).replace(/^[A-Z](?![A-Z])/, c => c.toLowerCase());

/** What a place should be checked for, as a sentence's list: each label
    lowered, those that can stand in for each other ("A bench or A box") too. */
export const kindsWords = (list) => andList(list.map(s => String(s).split(" or ").map(lowerFirst).join(" or ")));
