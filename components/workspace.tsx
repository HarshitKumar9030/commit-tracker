"use client";
import { assignReviewer } from "@/lib/assignment";
import { motion } from "framer-motion";
import Onboarding from "./onboarding";
import LiveSignal from "./live-signal";
import SignalMap from "./signal-map";
import AnimatedCount from "./animated-count";
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
  Plus,
} from "lucide-react";
import type { Commit, Review, Settings } from "@/lib/types";
import { Avatar, Empty, Modal } from "./primitives";
import DemoTour from "./demo-tour";
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
    [teamPortal, setTeamPortal] = useState(false);
  const notify = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 4500);
  };
  if (loading)
    return (
      <div className="loading">
        <Link2 size={40} />
        <p>Loading workspace…</p>
      </div>
    );
  if (locked || teamPortal)
    return (
      <Onboarding
        onSuccess={async () => {
          setTeamPortal(false);
          window.history.replaceState(null, "", location.pathname);
          await refresh();
        }}
        onCancel={data ? () => setTeamPortal(false) : undefined}
      />
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
            : "No new commits.",
        );
      }
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }
  async function saveSettings(s: Settings) {
    if (data!.mode === "demo")
      setData({
        ...data!,
        settings: s,
        commits: data!.commits.map((c) => {
          if (!c.review) {
            return {
              ...c,
              assignee: assignReviewer(c.sha, c.author, s.members, s),
            };
          }
          return c;
        }),
      });
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
        ? "Review saved."
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
    notify("Current task updated.");
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
              {page === name && (
                <motion.span
                  layoutId="nav-selection"
                  className="nav-highlight"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
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
          <button
            className="nav-item"
            data-tooltip="Change the repository, add or remove members, and copy your team invite."
            onClick={() => setSettingsOpen(true)}
          >
            <SettingsIcon size={18} />
            Team settings
          </button>
          <button
            className="workspace-switch"
            onClick={() => setIdentity(true)}
          >
            <span className="workspace-initial">
              {(data.settings.name || "Team")[0]}
            </span>
            <span>
              {data.settings.name || "Hackathon workspace"}
              <small>{data.settings.members.length} members</small>
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
              <LiveSignal active={connection === "Live workspace"} />
              {connection}
            </span>
            <div className="avatar-stack">
              {data.settings.members.map((m) => (
                <Avatar key={m.id} member={m} small />
              ))}
            </div>
            <button
              className="you-button"
              data-tooltip="View your profile, switch demo identities, or create another team."
              title="Your profile"
              onClick={() => setIdentity(true)}
            >
              <Avatar member={user} small />
              <ChevronDown size={13} />
            </button>
          </div>
        </header>
        <motion.div
          className="page-content"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {data.mode === "demo" && <DemoTour navigate={navigate} />}
          <div className="page-heading">
            <div>
              <h1>
                {page === "Commit feed"
                  ? "Repository activity"
                  : page === "My reviews"
                    ? "Review queue"
                    : page === "Team"
                      ? "Team members"
                      : page === "Presentation"
                        ? "Project recap"
                        : "Overview"}
              </h1>
              <p>
                {page === "Commit feed"
                  ? "View commits, inspect code changes, and assign reviews."
                  : page === "My reviews"
                    ? "Commits assigned to you for review."
                    : page === "Team"
                      ? "View member status, roles, and current tasks."
                      : page === "Presentation"
                        ? "Export commit history and review notes for your presentation."
                        : "Commit totals, pending reviews, and team status."}
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
              onManage={() => setSettingsOpen(true)}
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
                    {
                      value: data.settings.members.length,
                      label: "Team members",
                      icon: "team",
                    },
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
                      <AnimatedCount value={m.value} />
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
                          ? `${mine.length} commits assigned to you.`
                          : "No pending reviews"}
                      </h3>
                      <p>
                        {mine.length
                          ? "Open the queue to inspect diffs and submit feedback."
                          : "No pending reviews assigned to you."}
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
                    data-tooltip="Import the latest 20 commits from the monitored branch. Existing commits are skipped."
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
                        data-tooltip={
                          f === "All commits"
                            ? "Show all imported commits."
                            : f === "Needs review"
                              ? "Show commits without a submitted review."
                              : "Show approved commits."
                        }
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
                      data-tooltip="Search by commit title, author, or SHA."
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
                            ? "No pending reviews"
                            : "No commits yet"
                      }
                      detail={
                        search
                          ? "Try a title, author, or commit SHA."
                          : page === "My reviews"
                            ? "New reviews will appear here when your teammates push code."
                            : "Click Sync commits to import recent repository commits."
                      }
                    />
                  )}
                </div>
                <div className="feed-end">
                  <span className="mini-dot" />
                  {visible.length
                    ? "End of commit list"
                    : "No commits to display"}
                </div>
              </section>
              <aside className="right-rail">
                <section className="team-panel">
                  <div className="panel-heading">
                    <h2>Your team</h2>
                    <span>
                      {online.length}/{data.settings.members.length} online
                    </span>
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
                    data-tooltip="Update the task shown beside your name to the rest of the team."
                    className="team-footer"
                    onClick={() => setFocus(user.focus)}
                  >
                    Update your current task <ArrowUpRight size={15} />
                  </button>
                </section>
                <section className="pitch-panel">
                  <SignalMap compact />
                  <h2>Project recap</h2>
                  <p>
                    Export commit descriptions and review notes for your
                    presentation.
                  </p>
                  <button
                    data-tooltip="Create a Markdown recap from commit history and review notes."
                    onClick={() => navigate("Presentation")}
                  >
                    Open recap
                    <ArrowUpRight size={16} />
                  </button>
                  <span className="pitch-foot">Export as Markdown</span>
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
              Relay · Commit tracker
            </span>
            <span>
              {data.mode === "demo"
                ? "Demo mode · Changes saved in this browser"
                : "MongoDB connected"}
            </span>
          </footer>
        </motion.div>
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
          allowSelfReview={data.settings.allowSelfReview}
          onAssign={async (id) => {
            if (data.mode === "demo") setData({...data, commits:data.commits.map(c => c.sha === selected.sha ? {...c,assignee:id} : c)});
            else { await api("assign", {sha:selected.sha, assignee:id}); await refresh(); }
            setSelected({...selected,assignee:id});
          }}
          onReview={review}
          close={() => setSelected(null)}
        />
      )}
      {settingsOpen && (
        <SettingsDialog
          settings={data.settings}
          userId={user.id}
          demo={data.mode === "demo"}
          save={saveSettings}
          close={() => setSettingsOpen(false)}
        />
      )}
      {identity && (
        <Modal title="Team group" close={() => setIdentity(false)}>
          <p className="muted">
            {data.mode === "demo"
              ? "Switch profiles to test the demo."
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
          <button
            className="primary leave-demo"
            onClick={() => {
              setIdentity(false);
              setTeamPortal(true);
            }}
          >
            Create or join another team <Plus size={15} />
          </button>
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
        <Modal title="Update current task" close={() => setFocus(null)}>
          <p className="muted">Your current task is visible to your team.</p>
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
              Current task
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
