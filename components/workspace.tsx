"use client";
import { useState } from "react";
import {
  Link2,
  House,
  List,
  MessageSquare,
  Users,
  Monitor,
  Settings as SettingsIcon,
  ChevronDown,
  ArrowUpRight,
  GitFork,
  GitBranch,
  RefreshCw,
  Search,
  ArrowRight,
  Check,
  Menu,
  LogOut,
  Radio,
  X,
} from "lucide-react";
import type { Commit, Review, Settings } from "@/lib/types";
import { Avatar, Empty, Modal } from "./primitives";
import TeamView from "./team-view";
import CommitRow from "./commit-row";
import ReviewDialog from "./review-dialog";
import SettingsDialog from "./settings-dialog";
import Presentation from "./presentation";
import { api, useWorkspace } from "./use-workspace";
const nav = [
  { name: "Overview", icon: House },
  { name: "Commit feed", icon: List },
  { name: "My reviews", icon: MessageSquare },
  { name: "Team", icon: Users },
  { name: "Presentation", icon: Monitor },
];
export default function Workspace() {
  const {
    data,
    setData,
    locked,
    error,
    setError,
    online,
    connection,
    loading,
    refresh,
  } = useWorkspace();
  const [page, setPage] = useState("Commit feed"),
    [filter, setFilter] = useState("All commits"),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<Commit | null>(null),
    [settingsOpen, setSettingsOpen] = useState(false),
    [syncing, setSyncing] = useState(false),
    [toast, setToast] = useState(""),
    [menu, setMenu] = useState(false),
    [identity, setIdentity] = useState(false),
    [focus, setFocus] = useState<string | null>(null),
    [code, setCode] = useState(""),
    [loginId, setLoginId] = useState("harshit"),
    [joining, setJoining] = useState(false);
  const notify = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 4500);
  };
  async function join(e: React.FormEvent) {
    e.preventDefault();
    setJoining(true);
    try {
      await api("session", { id: loginId, code });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setJoining(false);
    }
  }
  if (loading)
    return (
      <div className="loading">
        <Link2 size={40} />
        <p>Finding your team’s rhythm…</p>
      </div>
    );
  if (locked)
    return (
      <div className="join-page">
        <div className="join-brand">
          <Link2 />
          relay
        </div>
        <div className="join-content">
          <span className="join-label">YOUR HACKATHON, IN SYNC</span>
          <h1>
            Great things happen
            <br />
            when we build together.
          </h1>
          <p>
            Join your four-person workspace. Catch up on the code,
            <br />
            take a review, and keep your team moving.
          </p>
          <form onSubmit={join}>
            <h2>Welcome to your workspace</h2>
            <label className="field">
              Who are you?
              <select
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
              >
                {locked.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Workspace access code
              <input
                required
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Your team’s shared code"
              />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button className="primary" disabled={joining}>
              {joining ? "Joining…" : "Join workspace"}
              <ArrowRight size={17} />
            </button>
            <a className="demo-link" href="/?demo=1">
              Explore the demo first <ArrowUpRight size={13} />
            </a>
          </form>
          <p className="join-foot">
            Four people. Different strengths. One shared pulse.
          </p>
        </div>
      </div>
    );
  if (!data)
    return (
      <div className="loading">
        <p role="alert">{error || "Unable to load the workspace."}</p>
        <button className="primary" onClick={() => void refresh()}>
          Try again
        </button>
      </div>
    );
  const user =
    data.settings.members.find((m) => m.id === data.userId) ||
    data.settings.members[0];
  const pending = data.commits.filter((c) => !c.review),
    reviewed = data.commits.filter((c) => c.review?.verdict === "approved");
  const mine = pending.filter((c) => c.assignee === user.id);
  const visible = data.commits.filter(
    (c) =>
      (page !== "My reviews" || c.assignee === user.id) &&
      (filter !== "Needs review" || !c.review) &&
      (filter !== "Reviewed" || c.review?.verdict === "approved") &&
      `${c.title} ${c.author} ${c.sha}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  async function sync() {
    setSyncing(true);
    try {
      if (data!.mode === "demo") {
        notify(
          "Demo workspace · Connect a repository in settings to sync real commits.",
        );
      } else {
        const r = await api("sync", {});
        await refresh();
        notify(
          r.added
            ? `${r.added} new commits. Your team is up to date.`
            : "All caught up. No new commits.",
        );
      }
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }
  async function saveSettings(s: Settings) {
    if (new Set(s.members.map((m) => m.login.toLowerCase())).size !== 4)
      throw new Error("Each teammate needs a unique GitHub username.");
    if (data!.mode === "demo") setData({ ...data!, settings: s });
    else {
      await api("settings", s);
      await refresh();
    }
    notify("Workspace settings saved.");
  }
  async function review(sha: string, verdict: Review["verdict"], note: string) {
    if (data!.mode === "demo")
      setData({
        ...data!,
        commits: data!.commits.map((c) =>
          c.sha === sha
            ? {
                ...c,
                review: {
                  verdict,
                  note,
                  by: user.id,
                  at: new Date().toISOString(),
                },
              }
            : c,
        ),
      });
    else {
      await api("review", { sha, verdict, note });
      await refresh();
    }
    notify(
      verdict === "approved"
        ? "Review shared. One less thing on your team’s mind."
        : "Feedback shared with the team.",
    );
  }
  async function saveFocus() {
    if (!focus?.trim()) return;
    if (data!.mode === "demo")
      setData({
        ...data!,
        settings: {
          ...data!.settings,
          members: data!.settings.members.map((m) =>
            m.id === user.id ? { ...m, focus } : m,
          ),
        },
      });
    else {
      await api("focus", { focus });
      await refresh();
    }
    setFocus(null);
    notify("Your focus is updated.");
  }
  const navigate = (name: string) => {
    setPage(name);
    setFilter("All commits");
    setSearch("");
    setMenu(false);
  };
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <a className="brand" href="/">
          <Link2 size={33} strokeWidth={3} />
          <span>relay</span>
          <span className="brand-period">.</span>
        </a>
        <span className="nav-label">Workspace</span>
        <nav>
          {nav.map(({ name, icon: Icon }) => (
            <button
              key={name}
              aria-current={page === name ? "page" : undefined}
              className={`nav-item ${page === name ? "active" : ""}`}
              onClick={() => navigate(name)}
            >
              <Icon size={19} />
              {name}
              {name === "My reviews" && mine.length > 0 && (
                <span className="nav-count">{mine.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="repo-mini">
            <GitFork size={16} />
            <span>{data.settings.repo.split("/")[1]}</span>
            <GitBranch size={12} />
          </div>
          <button className="nav-item" onClick={() => setSettingsOpen(true)}>
            <SettingsIcon size={18} />
            Repository settings
          </button>
          <button
            className="workspace-switch"
            onClick={() => setIdentity(true)}
          >
            <span className="workspace-initial">H</span>
            <span>
              Hackathon workspace<small>Four minds. One mission.</small>
            </span>
            <ChevronDown size={14} />
          </button>
        </div>
      </aside>
      {menu && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <main className="main">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Open navigation"
            onClick={() => setMenu(true)}
          >
            <Menu size={22} />
          </button>
          <div className="breadcrumb">
            Workspace <span>/</span>
            <strong>{page}</strong>
          </div>
          <div className="topbar-right">
            <span
              className={`connection ${connection === "Live workspace" ? "connected" : ""}`}
            >
              <span />
              {connection}
            </span>
            <div className="avatar-stack">
              {data.settings.members.map((m) => (
                <Avatar key={m.id} member={m} small />
              ))}
            </div>
            <button
              className="you-button"
              title="Your profile"
              onClick={() => setIdentity(true)}
            >
              <Avatar member={user} small />
              <ChevronDown size={13} />
            </button>
          </div>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <h1>
                {page === "Commit feed"
                  ? "Stay in sync. Keep building."
                  : page === "My reviews"
                    ? "A fresh pair of eyes."
                    : page === "Team"
                      ? "Different focus. Same team."
                      : page === "Presentation"
                        ? "Tell the story behind the code."
                        : "Your team’s shared pulse."}
              </h1>
              <p>
                {page === "Commit feed"
                  ? "Every commit, a little more context. Your team’s progress, all in one place."
                  : page === "My reviews"
                    ? "Your review queue. Help your teammates ship with confidence."
                    : page === "Team"
                      ? "Know who’s here, what’s moving, and where you can help."
                      : page === "Presentation"
                        ? "Turn what you’ve shipped into something worth sharing."
                        : "A little perspective on everything you’re building together."}
              </p>
            </div>
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {page === "Presentation" ? (
            <Presentation data={data} />
          ) : page === "Team" ? (
            <TeamView
              data={data}
              online={online}
              userId={user.id}
              onFocus={setFocus}
            />
          ) : (
            <div className="dashboard-grid">
              <section className="feed-column">
                <div className="metrics">
                  {[
                    {
                      value: data.commits.length,
                      label: "Total commits",
                      icon: "all",
                    },
                    {
                      value: pending.length,
                      label: "Awaiting review",
                      icon: "pending",
                    },
                    {
                      value: reviewed.length,
                      label: "Reviewed",
                      icon: "reviewed",
                    },
                    { value: 4, label: "Team members", icon: "team" },
                  ].map((m, i) => (
                    <button
                      key={m.label}
                      className="metric"
                      onClick={() =>
                        i === 3
                          ? navigate("Team")
                          : setFilter(
                              i === 1
                                ? "Needs review"
                                : i === 2
                                  ? "Reviewed"
                                  : "All commits",
                            )
                      }
                    >
                      <span className={`metric-icon metric-${m.icon}`}>
                        {i === 0 ? (
                          <List size={17} />
                        ) : i === 1 ? (
                          <MessageSquare size={17} />
                        ) : i === 2 ? (
                          <Check size={17} />
                        ) : (
                          <Users size={17} />
                        )}
                      </span>
                      <strong>{m.value.toString().padStart(2, "0")}</strong>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
                {page === "Overview" && (
                  <div className="overview-note">
                    <Radio size={23} />
                    <div>
                      <h3>
                        {mine.length
                          ? `${mine.length} commits could use your perspective.`
                          : "You have room to focus."}
                      </h3>
                      <p>
                        {mine.length
                          ? "A quick review keeps the whole team moving."
                          : "Your review queue is clear. Keep making your next big thing."}
                      </p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => navigate("My reviews")}
                    >
                      Your reviews <ArrowRight size={15} />
                    </button>
                  </div>
                )}
                <div className="feed-toolbar">
                  <h2>
                    {page === "My reviews"
                      ? "Your review queue"
                      : "Commit activity"}
                    <span>
                      {page === "My reviews"
                        ? data.commits.filter((c) => c.assignee === user.id)
                            .length
                        : data.commits.length}
                    </span>
                  </h2>
                  <button
                    className="primary sync-button"
                    disabled={syncing}
                    onClick={sync}
                  >
                    <RefreshCw
                      size={15}
                      className={syncing ? "spinning" : ""}
                    />
                    {syncing ? "Syncing…" : "Sync commits"}
                  </button>
                </div>
                <div className="filter-toolbar">
                  <div className="tabs" aria-label="Filter commits">
                    {["All commits", "Needs review", "Reviewed"].map((f) => (
                      <button
                        key={f}
                        aria-pressed={filter === f}
                        className={filter === f ? "selected" : ""}
                        onClick={() => setFilter(f)}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <div className="search">
                    <Search size={15} />
                    <input
                      aria-label="Search commits"
                      placeholder="Find a commit…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                      <button
                        aria-label="Clear search"
                        onClick={() => setSearch("")}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="commit-list">
                  {visible.map((c) => (
                    <CommitRow
                      key={c.sha}
                      c={c}
                      members={data.settings.members}
                      onSelect={setSelected}
                    />
                  ))}
                  {visible.length === 0 && (
                    <Empty
                      title={
                        search
                          ? "No matching commits"
                          : page === "My reviews"
                            ? "All clear. Keep building."
                            : "A fresh start for your team."
                      }
                      detail={
                        search
                          ? "Try a title, author, or commit SHA."
                          : page === "My reviews"
                            ? "New reviews will appear here when your teammates push code."
                            : "Sync commits to bring your repository into the conversation."
                      }
                    />
                  )}
                </div>
                <div className="feed-end">
                  <span className="mini-dot" />
                  {visible.length
                    ? "You’re all caught up. Back to building."
                    : "Your next idea starts here."}
                </div>
              </section>
              <aside className="right-rail">
                <section className="team-panel">
                  <div className="panel-heading">
                    <h2>Your team</h2>
                    <span>{online.length}/4 online</span>
                  </div>
                  <div className="team-list">
                    {data.settings.members.map((m) => (
                      <button
                        className="team-person"
                        key={m.id}
                        onClick={() =>
                          m.id === user.id
                            ? setFocus(m.focus)
                            : navigate("Team")
                        }
                      >
                        <Avatar member={m} />
                        <div>
                          <strong>
                            {m.name.split(" ")[0]}
                            {m.id === user.id && <small>you</small>}
                          </strong>
                          <span>{m.focus}</span>
                        </div>
                        <span
                          className={`presence-dot ${online.includes(m.id) ? "online" : ""}`}
                          title={
                            data.mode === "demo"
                              ? "Demo member"
                              : online.includes(m.id)
                                ? "Online"
                                : "Offline"
                          }
                        />
                      </button>
                    ))}
                  </div>
                  <button
                    className="team-footer"
                    onClick={() => setFocus(user.focus)}
                  >
                    What are you working on? <ArrowUpRight size={15} />
                  </button>
                </section>
                <section className="pitch-panel">
                  <div className="pitch-icon">
                    <Monitor size={20} />
                    <span className="spark">✳</span>
                  </div>
                  <h2>
                    Make room for
                    <br />
                    the big picture.
                  </h2>
                  <p>
                    Your commits become your story. Build a presentation-ready
                    recap while your team keeps shipping.
                  </p>
                  <button onClick={() => navigate("Presentation")}>
                    Open presentation
                    <ArrowUpRight size={16} />
                  </button>
                  <span className="pitch-foot">
                    Less catching up. More creating.
                  </span>
                </section>
                <div className="repo-caption">
                  <GitFork size={14} />
                  <a
                    href={`https://github.com/${data.settings.repo}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {data.settings.repo}
                  </a>
                  <ArrowUpRight size={12} />
                </div>
              </aside>
            </div>
          )}
          <footer className="page-footer">
            <span>
              <Link2 size={14} />
              Made for teams that ship together.
            </span>
            <span>
              {data.mode === "demo"
                ? "Demo mode · Changes saved in this browser"
                : "MongoDB connected · Built for your four-person crew"}
            </span>
          </footer>
        </div>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {selected && (
        <ReviewDialog
          commit={selected}
          members={data.settings.members}
          userId={user.id}
          onReview={review}
          close={() => setSelected(null)}
        />
      )}
      {settingsOpen && (
        <SettingsDialog
          settings={data.settings}
          demo={data.mode === "demo"}
          save={saveSettings}
          close={() => setSettingsOpen(false)}
        />
      )}
      {identity && (
        <Modal title="Your workspace" close={() => setIdentity(false)}>
          <p className="muted">
            {data.mode === "demo"
              ? "Explore the demo as any teammate."
              : "Signed in with your team’s shared access code."}
          </p>
          {data.settings.members.map((m) => (
            <button
              key={m.id}
              className={`identity-row ${m.id === user.id ? "selected" : ""}`}
              disabled={data.mode !== "demo"}
              onClick={() => {
                setData({ ...data, userId: m.id });
                setIdentity(false);
              }}
            >
              <Avatar member={m} />
              <div>
                <strong>{m.name}</strong>
                <span>{m.role}</span>
              </div>
              {m.id === user.id && <Check size={17} />}
            </button>
          ))}
          {data.mode === "demo" ? (
            <a className="primary leave-demo" href="/">
              Return to live workspace <ArrowRight size={16} />
            </a>
          ) : (
            <button
              className="secondary logout"
              onClick={async () => {
                await fetch("/api/session", { method: "DELETE" });
                setIdentity(false);
                await refresh();
              }}
            >
              <LogOut size={16} />
              Leave workspace
            </button>
          )}
        </Modal>
      )}
      {focus !== null && (
        <Modal title="Find your focus" close={() => setFocus(null)}>
          <p className="muted">
            Let your teammates know what has your attention.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await saveFocus();
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          >
            <label className="field">
              I’m working on…
              <input
                required
                maxLength={100}
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                autoFocus
              />
            </label>
            <div className="dialog-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setFocus(null)}
              >
                Cancel
              </button>
              <button className="primary">Update focus</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
