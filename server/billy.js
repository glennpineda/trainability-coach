import Anthropic from "@anthropic-ai/sdk";
import { CATEGORIES } from "./equipment.js";

/**
 * Billy, in Coach: the same assistant as in Studio, with Coach's own work.
 *
 * Set up the way Studio sets him up, with the same names, so one key serves
 * both apps (DEPLOYMENT.md in Studio, "Billy, and his voice"):
 *
 *   ANTHROPIC_API_KEY   unset, Billy is not offered anywhere in Coach
 *   ASSISTANT_MODEL     which model answers (default below)
 *   ASSISTANT_TRACE     logs each turn while debugging; leave off
 *
 * The key stays on the server. The browser sends the conversation and gets
 * an answer back; it never sees the key, the prompt or the tools.
 *
 * What Coach adds over Studio's Billy is reading what a trainer gives him: a
 * photo (a client's food log, a whiteboard, a form) or a PDF (an intake form,
 * a program). What he does not have yet is Studio's manual search, booking
 * or anything to do with money: Coach does none of those.
 */

/* Sonnet 5.5 (Glenn, 16 Oct 2026: "good enough for this"): looking up a
   trainer's clients and reading a photo or a PDF is well within it, at half
   Opus's price. ASSISTANT_MODEL=claude-opus-5-5 is there if it ever isn't. */
export const model = () => process.env.ASSISTANT_MODEL || "claude-sonnet-5-5";
export const configured = () => !!process.env.ANTHROPIC_API_KEY;

/* ASSISTANT_API_BASE points Billy at a stand-in on this machine, for testing
   without a key, as in Studio. Only an address on this machine is taken, so
   a wrong value on a host cannot send the key and a trainer's question
   somewhere else. */
function baseURL() {
  const base = String(process.env.ASSISTANT_API_BASE || "").trim().replace(/\/+$/, "");
  return /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(base) ? base : undefined;
}

let client = null;
const anthropic = () => (client ||= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, baseURL: baseURL() }));

/* What a trainer may hand him, as Claude takes them. */
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
export const PDF_TYPE = "application/pdf";

/* Ask, run what he asked for, ask again: a few rounds is plenty for what he
   can look up today. */
const MAX_TURNS = 6;

const TOOLS = [
  {
    name: "my_clients",
    description: "The clients on this trainer's own list in Trainability Studio: name, pronouns, email, phone, birthday, the day they joined the list, their last session and the next one booked, whether the trainer has archived them, and how many other trainers they also train with. Use it whenever the trainer mentions a client by name or asks about their clients.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "my_equipment",
    description: "The equipment this trainer has told Coach about: the checklist of kinds (yes, no, or not answered yet) and the particular pieces, each with whether they have it and where. Read it before suggesting exercises, and before asking about a piece.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "remember_equipment",
    description: "Write down what the trainer has just told you about their equipment, so they are never asked again. Only what they said in this conversation, never a guess. kind \"category\" answers one of the checklist's kinds; kind \"item\" is a particular piece, with the checklist kind it belongs to.",
    input_schema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["category", "item"] },
        category: { type: "string", enum: CATEGORIES.map(c => c.key), description: "The checklist kind: " + CATEGORIES.map(c => `${c.key} (${c.label})`).join(", ") },
        name: { type: "string", description: "For an item: the piece, as the trainer would say it, such as \"Low row machine\"." },
        has: { type: "boolean" },
        where: { type: "string", description: "Where it is, if they said: \"the studio\", \"Maria's home\"." },
      },
      required: ["kind", "category", "has"],
      additionalProperties: false,
    },
  },
];

function systemPrompt(user) {
  const today = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", weekday: "long", year: "numeric", month: "long", day: "numeric",
  }).format(new Date());
  return [
    `You are Billy, the assistant inside Trainability Coach, the coaching app of a personal-training business; the business runs its schedule and billing in Trainability Studio, where you also work. You are talking to ${user.name}, who has a ${user.role === "staff" ? "front-desk" : user.role} account.`,
    `Today is ${today} (Pacific time).`,
    "",
    "Your manner:",
    "- Dry, quick and faintly sardonic: the colleague who knows the work and will not make a meal of it. Understated, never chirpy.",
    "- One line of you per ordinary answer, aimed at yourself, the app or the situation, never at the person, their clients or anybody's competence. Never in the middle of steps.",
    "- Straight-faced when it is not funny: health, injuries, money, an upset client, bad news, or a mistake of yours.",
    "- Short sentences. This is a panel beside their work, not an essay.",
    "",
    "What you do here:",
    "- Read what they give you. A photo or a PDF arrives with their message: a client's food log, a form, a program, a whiteboard. Say what is in it plainly and answer what they asked about it. If you cannot read part of it, say which part.",
    "- Know their clients. Look a client up with your tool whenever one is mentioned rather than guessing, and use only what it gives back.",
    "- Know their equipment. Check what they have before you suggest an exercise. When an exercise needs a particular piece you have no answer about (a low row machine, a leg press), ask them once, plainly, and write their answer down. Without the piece, keep the movement and change the equipment to a kind they have: no low row machine but dumbbells means a dumbbell row.",
    "- Write down only what they have just told you about equipment, and say in a few words that you have noted it. Never record a guess, and never answer the checklist for them.",
    "- Never name your tools. Say what you could or could not find out, in plain words.",
    "",
    "Hard rules:",
    "- Apart from noting their equipment, you change nothing. You cannot book, cancel, message a client, or touch money, and Coach does not keep clients: they are added and changed in Studio. Say so and point them there.",
    "- You are not a doctor or a dietitian. On pain, injury, illness, medication or an eating disorder, be brief and kind, and say a professional should see it.",
    "- Never guess a number, a date or a fact about a client. If you cannot see it, say so.",
  ].join("\n");
}

/**
 * One question, answered. `history` is the conversation so far in Claude's own
 * shape, kept by the browser and sent back whole, so a follow-up knows what
 * "that one" meant and a photo sent three questions ago is still there to be
 * read. Coach keeps none of it: a trainer's questions about their clients are
 * not stored anywhere.
 *
 * `tools` runs a tool as the person asking (the same session), so nothing it
 * returns is more than they could see on their own screen.
 */
export async function answer(user, history, tools) {
  const messages = history.map(m => ({ role: m.role, content: m.content }));
  let usage = { input_tokens: 0, output_tokens: 0 };

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const reply = await anthropic().beta.messages.create({
      model: model(),
      max_tokens: 16000,
      output_config: { effort: "medium" },
      /* When the model declines on safety grounds, the API asks the model it
         names as a fallback instead, inside the same call, so a declined
         question about a client's injury still gets an answer. */
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: systemPrompt(user),
      tools: TOOLS,
      messages,
    });
    usage = {
      input_tokens: usage.input_tokens + (reply.usage?.input_tokens || 0),
      output_tokens: usage.output_tokens + (reply.usage?.output_tokens || 0),
    };
    /* Kept whole, thinking and all: the next request has to carry it back
       unchanged. */
    messages.push({ role: "assistant", content: reply.content });
    if (process.env.ASSISTANT_TRACE) {
      console.error("[billy] turn", turn, reply.stop_reason, reply.content.map(c => c.type).join("+"));
    }

    if (reply.stop_reason === "refusal") {
      return { reply: "That one I can't help with. Try asking it another way.", messages, usage, model: reply.model, refused: true };
    }
    if (reply.stop_reason !== "tool_use") {
      const text = reply.content.filter(c => c.type === "text").map(c => c.text).join("\n").trim();
      return {
        reply: text || (reply.stop_reason === "max_tokens"
          ? "That took more room than I have for one answer. Ask me for one part of it."
          : "I couldn't put an answer together for that one. Try asking it another way."),
        messages, usage, model: reply.model,
      };
    }

    const results = [];
    for (const block of reply.content.filter(c => c.type === "tool_use")) {
      let out;
      try {
        out = tools[block.name] ? await tools[block.name](block.input || {}) : { error: "No such thing to look up." };
      } catch (err) {
        out = { error: err.message || "That lookup failed." };
      }
      results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(out).slice(0, 60_000), is_error: !!out?.error });
    }
    messages.push({ role: "user", content: results });
  }

  return {
    reply: "That took more looking up than I'm allowed in one go. Try asking for one thing at a time.",
    messages, usage, model: model(),
  };
}

/* What the browser may send as a message's content: its own words, and a
   photo or a PDF as Claude takes them. Anything else in a user turn (tool
   results) must be one the server wrote, and those arrive back exactly as they
   left, so they are let through; the shape is checked, not trusted. */
export function checkHistory(history) {
  if (!Array.isArray(history) || !history.length) return "Ask something.";
  if (history.length > 60) return "That conversation is too long. Start a new one.";
  if (history[0].role !== "user") return "A conversation starts with a question.";
  for (const m of history) {
    if (m?.role !== "user" && m?.role !== "assistant") return "Each message is from you or from Billy.";
    if (typeof m.content === "string") {
      if (m.content.length > 4000) return "That question is too long.";
      continue;
    }
    if (!Array.isArray(m.content)) return "That message could not be read.";
    if (m.role === "user") {
      for (const b of m.content) {
        if (b?.type === "text" && typeof b.text === "string" && b.text.length <= 4000) continue;
        if (b?.type === "tool_result") continue;
        if (b?.type === "image" && b.source?.type === "base64" && IMAGE_TYPES.includes(b.source.media_type)) continue;
        if (b?.type === "document" && b.source?.type === "base64" && b.source.media_type === PDF_TYPE) continue;
        return "Billy reads photos (JPEG, PNG, GIF or WebP) and PDFs.";
      }
    }
  }
  return null;
}
