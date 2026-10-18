import * as store from "./iq-store.js";
import * as reviews from "./reviews.js";
import { convertText } from "../src/lib/units.js";

/**
 * Coach IQ's principles, as the app hands them out: how Trainability designs
 * a program, one topic each, in prose (coach-iq/principles/, now kept in the
 * app by iq-store.js).
 *
 * Billy reads only those the Primary Master has reviewed (Glenn, 17 Oct
 * 2026: "Do all 3"; Coach IQ's rule that nothing goes in until it has been
 * reviewed). A draft, whether a new topic or one put back to draft by a
 * flag, is not his to work from until it is approved.
 */

const all = () => store.current().principles || [];

export const isPrinciple = (key) => all().some(p => p.key === key);
export const principleByKey = (key) => all().find(p => p.key === key) ?? null;

/** Every principle with its latest mark, for Review Coach IQ. */
export function principlesForReview() {
  return all().map(p => ({ ...p, mark: reviews.markOf("principle", p.key) }));
}

export function principlesSummary() {
  const list = principlesForReview();
  return { total: list.length, approved: list.filter(p => p.status === "reviewed").length, flagged: list.filter(p => p.mark?.mark === "flag").length };
}

const forBilly = () => all().filter(p => p.status === "reviewed");

/**
 * Billy's tool: with no topic, the list of topics and what each covers; with
 * one, its text, its weights and distances in the trainer's units. A topic is
 * matched by its key or its title, loosely.
 */
export function principlesFor(topic, units) {
  const list = forBilly();
  const index = list.map(p => ({ topic: p.key, title: p.title, covers: p.covers }));
  const want = String(topic || "").trim().toLowerCase();
  if (!want) return { topics: index, note: "Ask again with a topic to read it." };
  const hit = list.find(p => p.key === want || p.title.toLowerCase() === want)
    || list.find(p => p.key.includes(want.replace(/\s+/g, "-")) || p.title.toLowerCase().includes(want));
  if (!hit) return { error: "No reviewed principle on that topic.", topics: index };
  return { topic: hit.key, title: hit.title, text: convertText(hit.body, units) };
}
