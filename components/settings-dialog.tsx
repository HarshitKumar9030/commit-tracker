"use client";
import { useState } from "react";
import { Copy, Check, GitFork } from "lucide-react";
import type { Settings } from "@/lib/types";
import { Modal } from "./primitives";
export default function SettingsDialog({
  settings,
  demo,
  save,
  close,
}: {
  settings: Settings;
  demo: boolean;
  save: (s: Settings) => Promise<void>;
  close: () => void;
}) {
  const [value, setValue] = useState(settings),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false);
  return (
    <Modal title="Repository settings" close={close}>
      <p className="muted">
        One repository. Four teammates. A shared sense of direction.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await save(value);
            close();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          GitHub repository
          <div className="input-icon">
            <GitFork size={17} />
            <input
              required
              pattern="[\w.\-]+/[\w.\-]+"
              value={value.repo}
              onChange={(e) => setValue({ ...value, repo: e.target.value })}
              placeholder="owner/repository"
            />
          </div>
        </label>
        <label className="field">
          Branch
          <input
            required
            value={value.branch}
            onChange={(e) => setValue({ ...value, branch: e.target.value })}
          />
        </label>
        <h3>Your four-person crew</h3>
        <p className="muted">
          GitHub usernames let Relay avoid assigning authors their own code.
        </p>
        <div className="member-fields">
          {value.members.map((m, i) => (
            <div key={m.id}>
              <label className="field">
                Name
                <input
                  required
                  aria-label={`Member ${i + 1} name`}
                  value={m.name}
                  onChange={(e) =>
                    setValue({
                      ...value,
                      members: value.members.map((v, j) =>
                        j === i ? { ...v, name: e.target.value } : v,
                      ),
                    })
                  }
                />
              </label>
              <label className="field">
                GitHub username
                <input
                  required
                  pattern="[a-zA-Z0-9\-]+"
                  aria-label={`Member ${i + 1} GitHub username`}
                  value={m.login}
                  onChange={(e) =>
                    setValue({
                      ...value,
                      members: value.members.map((v, j) =>
                        j === i ? { ...v, login: e.target.value } : v,
                      ),
                    })
                  }
                />
              </label>
            </div>
          ))}
        </div>
        <div className="setup-note">
          <strong>Connect your push events</strong>
          <p>
            In GitHub → Settings → Webhooks, add this URL with application/json,
            the secret from GITHUB_WEBHOOK_SECRET, and push events.
          </p>
          <button
            type="button"
            className="copy-url"
            onClick={async () => {
              await navigator.clipboard.writeText(
                `${location.origin}/api/webhooks/github`,
              );
              setCopied(true);
            }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}{" "}
            /api/webhooks/github
          </button>
        </div>
        {demo && (
          <p className="muted">
            Demo changes stay in this browser. Add your environment variables to
            enable MongoDB and live GitHub sync.
          </p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
