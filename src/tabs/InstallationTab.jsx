import React, { useCallback, useEffect, useState } from "react";
import { FolderOpen, Loader2 } from "lucide-react";
import { apiRequest } from "../lib/api";
import { TabHeading } from "./TabHeading";

const muted = { color: "var(--iron)" };

/**
 * Installation, for the Primary Master: settings for this copy of Coach on
 * its server, as Studio has under Settings → Installation. So far one:
 * Where files are saved (server/durable-home.js).
 *
 * The host rebuilds the app's own folder on every deploy, so what Coach
 * keeps on disk has to live where the host leaves it alone: on GoDaddy, its
 * Private Storage, /private. The app chooses that by itself; this is for
 * naming another. The server tries the folder before accepting it and says
 * why not in its own words. Nothing already saved is moved.
 */
export function InstallationTab({ onSignedOut }) {
  const [state, setState] = useState(null);
  const [folder, setFolder] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const fail = useCallback((err) => {
    if (err.status === 401) onSignedOut?.();
    else setError(err.code === "studio_unreachable" || !err.status ? "Couldn't reach Trainability. Check your connection and try again." : err.message);
  }, [onSignedOut]);

  useEffect(() => {
    let alive = true;
    apiRequest("GET", "/storage")
      .then(out => { if (alive) { setState(out); setFolder(out.chosen || ""); } })
      .catch(err => { if (alive) fail(err); });
    return () => { alive = false; };
  }, [fail]);

  const save = async (next) => {
    setBusy(true); setError(""); setDone("");
    try {
      const out = await apiRequest("PUT", "/storage", { folder: next });
      setState(out); setFolder(out.chosen || "");
      setDone(out.chosen ? `Files are now saved in ${out.folder}.` : `Back to the folder the app chooses: ${out.folder}.`);
    } catch (err) { fail(err); } finally { setBusy(false); }
  };

  const typed = folder.trim();
  const unchanged = typed === (state?.chosen || "");

  return (
    <div className="max-w-5xl mx-auto px-4">
      <TabHeading>Installation</TabHeading>
      <p className="text-sm -mt-2 mb-4" style={muted}>Settings for this copy of Coach on its server.</p>

      <section className="cx-card p-4">
        <h2 className="font-semibold flex items-center gap-2">
          <FolderOpen size={18} style={{ color: "var(--accent)" }} aria-hidden="true" /> Where files are saved
        </h2>
        <p className="text-sm mt-1 mb-3" style={muted}>
          Files Coach keeps are written to one folder on the server. It has to be a folder the host keeps when the
          app is deployed again, and outside the app's own folder.
        </p>

        {!state && !error && <p className="text-sm" style={muted}>Reading…</p>}
        {!state && error && <p className="text-sm" style={{ color: "var(--ember)" }}>{error}</p>}

        {state && (
          <div className="grid gap-3 text-sm">
            <div className="rounded-lg p-3" style={{ background: "var(--ghost-fill)" }}>
              <div className="text-xs uppercase tracking-wide" style={muted}>Saved in now</div>
              <div className="mt-1 break-all"><code>{state.filesIn}</code></div>
              <div className="text-xs mt-1" style={muted}>
                {state.fixed ? "Set in the host's own settings." : state.chosen ? "Inside the folder you named." : "Inside the folder the app chooses by itself."}
              </div>
            </div>

            {state.unusable && (
              <p style={{ color: "var(--ember)" }}>
                The folder named before, <code>{state.unusable}</code>, can no longer be written to, so the app is
                using its own choice. Name it again, or another.
              </p>
            )}

            {state.fixed ? (
              <p style={muted}>
                The host's settings name this folder (<code>COACH_FILES_DIR</code>), and it is not changed from here.
              </p>
            ) : (
              <>
                <label className="grid gap-1">
                  <span className="text-xs" style={muted}>Folder on the server</span>
                  <input className="cx-input" value={folder} placeholder={state.automatic}
                    autoCapitalize="off" autoCorrect="off" spellCheck={false}
                    onChange={e => { setFolder(e.target.value); setDone(""); }}
                    onKeyDown={e => { if (e.key === "Enter" && typed && !unchanged && !busy) save(typed); }} />
                </label>
                <p className="text-xs" style={muted}>
                  The full path, starting with a slash. Coach keeps its files in a <code>trainability-coach</code> folder
                  inside it. The app tries the folder first and changes nothing if it cannot write there. Files
                  already saved stay where they are.
                </p>
                {error && <p style={{ color: "var(--ember)" }}>{error}</p>}
                {done && <p style={{ color: "var(--cerulean)" }}>{done}</p>}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="cx-btn-primary px-5 py-2 text-sm inline-flex items-center gap-2"
                    disabled={busy || !typed || unchanged} aria-busy={busy} onClick={() => save(typed)}>
                    {busy ? <><Loader2 size={15} className="animate-spin" aria-hidden="true" /> Saving…</> : "Save folder"}
                  </button>
                  {state.chosen && (
                    <button type="button" className="cx-btn-quiet px-4 py-2 text-sm" disabled={busy} onClick={() => save("")}>
                      Let the app choose
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
