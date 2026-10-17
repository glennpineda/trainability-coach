import React, { useEffect, useState } from "react";

/**
 * A line of text that cycles through the same thought in twenty languages:
 * Studio's src/auth/PhraseCycle.jsx, taken as it is with its "you belong
 * here" list (Glenn, 17 Oct 2026: "Can we have the same “you belong here
 * animation” on the login screen like the studio has?"), under the logo on
 * the sign-in screen. Studio's notes on the list follow.
 *
 * English first, so the opening frame — and any screenshot of it — is the one
 * most people can read. Then Norwegian and Tagalog, which are here because
 * this studio's people speak them, and the rest roughly by number of speakers.
 * Both lists run in the same order, so the two screens feel like one app.
 *
 * The phrase is idiomatic rather than word-for-word: several of these
 * languages have no natural way to say "belong" in this sense, so they say
 * "your place is here", which is the same thought in the way that language
 * actually says it.
 *
 * Sentence case with a full stop, in whatever mark that language actually
 * ends a sentence with — not a period everywhere. Chinese and Japanese take
 * the ideographic stop, Hindi, Marathi and Bengali take the danda, Urdu has
 * its own; Arabic, Telugu and Korean use the period. The scripts with no
 * capital letters at all — every Asian and Indic one here, plus Arabic and
 * Urdu — are simply left as they are.
 *
 * Decorative, so the cycling text is hidden from screen readers and one static
 * line is exposed instead: a live region re-announcing a new phrase every two
 * seconds would be unusable.
 */
export const BELONGING = [
  { lang: "en", text: "You belong here." },
  { lang: "no", text: "Du h\u00f8rer til her." },
  { lang: "tl", text: "Dito ka nabibilang." },
  { lang: "es", text: "Este es tu lugar." },
  { lang: "zh", text: "\u4f60\u5c5e\u4e8e\u8fd9\u91cc\u3002" },
  { lang: "pt", text: "Seu lugar \u00e9 aqui." },
  { lang: "fr", text: "Ta place est ici." },
  { lang: "de", text: "Du geh\u00f6rst hierher." },
  { lang: "hi", text: "\u0906\u092a\u0915\u0940 \u091c\u0917\u0939 \u092f\u0939\u0940\u0902 \u0939\u0948\u0964" },
  { lang: "ar", text: "\u0645\u0643\u0627\u0646\u0643 \u0647\u0646\u0627.", rtl: true },
  { lang: "bn", text: "\u09a4\u09cb\u09ae\u09be\u09b0 \u099c\u09be\u09af\u09bc\u0997\u09be \u098f\u0996\u09be\u09a8\u09c7\u0987\u0964" },
  { lang: "ru", text: "\u0422\u0432\u043e\u0451 \u043c\u0435\u0441\u0442\u043e \u0437\u0434\u0435\u0441\u044c." },
  { lang: "ur", text: "\u06cc\u06c1 \u062c\u06af\u06c1 \u0622\u067e \u06a9\u06cc \u06c1\u06d2\u06d4", rtl: true },
  { lang: "id", text: "Tempatmu di sini." },
  /* Shorter than the literal "\u3053\u3053\u304c\u3042\u306a\u305f\u306e\u5c45\u5834\u6240\u3067\u3059" on purpose. Japanese
     writes fullwidth, so that sentence ran 181px against a 135px wordmark and
     dragged the whole sign-in lockup left every time it came round. Dropping
     the subject is what Japanese does anyway, and \u3067\u3059 keeps it at the same
     politeness as the other nineteen. Anything added here wants to measure
     under about 130px at 14px type, which is where Korean and Bengali sit. */
  { lang: "ja", text: "\u3053\u3053\u304c\u5c45\u5834\u6240\u3067\u3059\u3002" },
  { lang: "sw", text: "Mahali pako ni hapa." },
  { lang: "mr", text: "\u0924\u0941\u091d\u0940 \u091c\u093e\u0917\u093e \u0907\u0925\u0947\u091a \u0906\u0939\u0947\u0964" },
  { lang: "te", text: "\u0c28\u0c40 \u0c1a\u0c4b\u0c1f\u0c41 \u0c07\u0c15\u0c4d\u0c15\u0c21\u0c47." },
  { lang: "tr", text: "Buras\u0131 senin yerin." },
  { lang: "ko", text: "\ub2f9\uc2e0\uc758 \uc790\ub9ac\ub294 \uc5ec\uae30\uc608\uc694." },
];

export const PHRASE_MS = 2600;

/* `align` is "center" everywhere except under the sign-in wordmark, where the
   line hangs off the left edge of the word above it. A class passed in cannot
   do this: `justify-start` and `justify-center` would both be on the element,
   and which one won would be down to their order in Tailwind's sheet rather
   than to anything written here. */
export function PhraseCycle({ phrases, label, className = "text-base", style, align = "center" }) {
  const [index, setIndex] = useState(0);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (query?.matches) { setStill(true); return; }
    const timer = setInterval(() => setIndex(i => (i + 1) % phrases.length), PHRASE_MS);
    return () => clearInterval(timer);
  }, [phrases.length]);

  // Index is held across a list that could be shorter; guard rather than
  // render undefined if this is ever reused with a changing list.
  const current = still ? phrases[0] : phrases[index % phrases.length];

  return (
    /* The size class goes on the wrapper as well as the text, so the fixed
       height is measured in the text's own em rather than the parent's —
       otherwise raising the size clips the tall scripts first. */
    <div
      className={`flex items-center ${align === "start" ? "justify-start" : "justify-center"} ${className}`}
      // Fixed height: the phrases differ in length and script, and what sits
      // below must not shuffle every couple of seconds. Roomy enough for
      // Devanagari and Bengali, which run taller than the Latin ones.
      style={{ height: "1.7em" }}
    >
      <span className="sr-only">{label}</span>
      <span
        key={index}
        aria-hidden="true"
        lang={current.lang}
        dir={current.rtl ? "rtl" : "ltr"}
        className="cx-cycle whitespace-nowrap"
        style={{ color: "var(--iron)", ...style }}
      >
        {current.text}
      </span>
    </div>
  );
}

