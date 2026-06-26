# Agent Teams — Master Reference Guide

> Source of truth: https://code.claude.com/docs/en/agent-teams (synced as of v2.1.186).
> Purpose: a build-better playbook for spinning up effective Claude Code agent teams.

Agent teams coordinate **multiple Claude Code instances** working together. One session is the **lead** (coordinates, assigns, synthesizes). **Teammates** each run in their own context window and can message **each other directly** — not just report back to the lead.

This is the key difference from subagents.

---

## 1. Enable (required — off by default)

Agent teams are **experimental and disabled by default**. Without the flag, no team is created, no directories written, and Claude will not spawn or propose teammates.

`settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Or export `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in the shell.

---

## 2. Teams vs Subagents — pick the right tool

|                | Subagents | Agent teams |
|----------------|-----------|-------------|
| Context        | Own window; result returns to caller | Own window; fully independent |
| Communication  | Report back to main agent only | Teammates message each other directly |
| Coordination   | Main agent manages all work | Shared task list + self-coordination |
| Best for       | Focused tasks where only the result matters | Work needing discussion + collaboration |
| Token cost     | Lower (summarized back) | Higher (each teammate = separate Claude) |

**Rule of thumb:** workers need to talk to each other / challenge each other → team. Workers just need to fetch a result → subagent. Sequential, same-file, or dependency-heavy work → single session.

---

## 3. When teams pay off

Strongest use cases (parallel exploration adds real value):

- **Research & review** — investigate different angles, then share + challenge findings.
- **New modules / features** — each teammate owns a separate piece, no stepping on each other.
- **Debugging with competing hypotheses** — test rival theories in parallel, converge faster.
- **Cross-layer coordination** — frontend / backend / tests, each owned by a different teammate.

Teams add coordination overhead and use **significantly more tokens**. Avoid for sequential tasks, same-file edits, or heavy-dependency work.

---

## 4. Start a team

Enable the flag, then just describe the task + teammates in natural language. No setup/create step (pre-v2.1.178 `TeamCreate`/`TeamDelete` tools no longer exist). Cleanup is automatic on session exit.

Example (works because the three roles are independent):

```text
I'm designing a CLI tool that tracks TODO comments across a codebase.
Spawn three teammates to explore from different angles:
one on UX, one on technical architecture, one playing devil's advocate.
```

The lead populates a shared task list, spawns a teammate per perspective, and synthesizes when done.

**Agent panel (lead's terminal), in-process mode:**
- ↑/↓ — select a teammate
- Enter — open its transcript + message it directly
- Esc — interrupt its current turn
- `x` — stop the selected teammate
- Ctrl+T — toggle the task list

Idle teammate rows hide after 30s and reappear on next turn. The teammate stays running + addressable while hidden.

---

## 5. Control the team

All control is natural language to the lead.

### Display modes (`teammateMode`)
- `"in-process"` (**default**) — all teammates in the main terminal. Any terminal, no setup.
- `"auto"` — split panes when inside tmux or iTerm2, else in-process.
- `"tmux"` — split panes, auto-detect tmux vs iTerm2.
- `"iterm2"` — iTerm2 native panes (needs `it2` CLI).

Set in `~/.claude/settings.json`:
```json
{ "teammateMode": "auto" }
```
Per session: `claude --teammate-mode auto`.

Split panes need **tmux or iTerm2**. Not supported in VS Code integrated terminal, Windows Terminal, or Ghostty.

### Specify teammates + models
```text
Spawn 4 teammates to refactor these modules in parallel. Use Sonnet for each teammate.
```
Teammates do **not** inherit the lead's `/model` by default. Set **Default teammate model** in `/config` (pick "Default (leader's model)" to follow the lead). Teammates **do** inherit the lead's effort level.

### Require plan approval (risky work)
```text
Spawn an architect teammate to refactor the authentication module.
Require plan approval before they make any changes.
```
Teammate stays in read-only plan mode → submits plan → lead approves or rejects with feedback → revise + resubmit → on approval, exits plan mode + implements. The lead decides autonomously; steer it: *"only approve plans that include test coverage"*.

### Talk to teammates directly
Each teammate is a full independent session. Select in the agent panel (Enter) or click its pane, then type.

### Tasks
Shared task list. States: **pending → in progress → completed**. Tasks can depend on others; a pending task with unresolved deps can't be claimed until deps complete (auto-unblocks). 
- **Lead assigns** explicitly, or
- **Self-claim** — a teammate picks the next unassigned, unblocked task after finishing.

File locking prevents claim races.

### Shut down a teammate
```text
Ask the researcher teammate to shut down
```
Teammate can approve (exits gracefully) or reject with explanation. Shared dirs auto-clean on session end.

---

## 6. Quality gates with hooks

Enforce rules at lifecycle points (exit code 2 = block + send feedback):

- `TeammateIdle` — runs before a teammate goes idle. Exit 2 → send feedback + keep it working.
- `TaskCreated` — runs at task creation. Exit 2 → prevent creation + feedback.
- `TaskCompleted` — runs at task completion. Exit 2 → prevent completion + feedback.

Use to enforce e.g. "tests must pass before a task is marked complete."

---

## 7. Architecture / mechanics

| Component | Role |
|-----------|------|
| Team lead | Main session; spawns teammates + coordinates |
| Teammates | Separate Claude Code instances doing assigned tasks |
| Task list | Shared work items teammates claim + complete |
| Mailbox   | Messaging between agents |

- Team forms when the first teammate is spawned. You request them, or Claude proposes (you always confirm).
- Storage (session-derived name = `session-` + first 8 chars of session ID):
  - Team config: `~/.claude/teams/{team-name}/config.json` — removed on session end. Holds runtime state (session IDs, tmux pane IDs). **Do not hand-edit / pre-author** — overwritten on next state update.
  - Task list: `~/.claude/tasks/{team-name}/` — **persists locally**, never uploaded, survives resume. Retention = `cleanupPeriodDays`.
- `members` array in team config lists each teammate's name, agent ID, agent type — teammates read it to discover each other.
- **No project-level team config.** A `.claude/teams/teams.json` in the repo is treated as an ordinary file, not config.

### Reuse subagent definitions as teammate roles
Reference any subagent type (project / user / plugin / CLI scope) when spawning:
```text
Spawn a teammate using the security-reviewer agent type to audit the auth module.
```
- Teammate honors that definition's `tools` allowlist and `model`; its body is **appended** to the system prompt (not replacing it).
- `SendMessage` + task-management tools are **always available** even if `tools` restricts others.
- `skills` and `mcpServers` frontmatter are **NOT applied** to teammates — they load skills/MCP from project + user settings like a normal session.

### Permissions
Teammates start with the **lead's** permission mode. `--dangerously-skip-permissions` propagates to all. You can change individual teammate modes after spawn, but **not** per-teammate at spawn time.

### Context + communication
Each teammate loads the same project context as a regular session (CLAUDE.md, MCP, skills) + the spawn prompt. The **lead's conversation history does NOT carry over**.
- Messages auto-deliver (lead doesn't poll).
- Idle teammates auto-notify the lead.
- Shared task list visible to all.
- Message a specific teammate by name; to reach everyone, send one message per recipient.
- Name teammates in the spawn instruction to get predictable names you can reference later.

---

## 8. Best practices

- **Give enough context.** Teammates don't inherit lead history — put task specifics in the spawn prompt (paths, constraints, stack details, expected output format, severity ratings).
- **Team size: start with 3–5.** Token cost scales linearly; coordination overhead grows; diminishing returns past a point. Three focused teammates beat five scattered ones.
- **~5–6 tasks per teammate** keeps everyone busy and lets the lead reassign if someone gets stuck. 15 independent tasks → ~3 teammates.
- **Size tasks right.** Self-contained units with a clear deliverable (a function, a test file, a review). Too small = overhead > benefit; too large = long runs without check-ins.
- **Wait for teammates.** If the lead starts doing the work itself: *"Wait for your teammates to complete their tasks before proceeding."*
- **Start with research/review** (no code writing) to learn teams without parallel-implementation conflicts.
- **Avoid file conflicts.** Each teammate owns a different set of files. Two editing one file = overwrites.
- **Monitor + steer.** Check progress, redirect dead ends, synthesize as findings arrive. Don't let it run unattended too long.

---

## 9. Reusable spawn-prompt templates

**Parallel code review (distinct lenses, no overlap):**
```text
Spawn three teammates to review PR #142:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review and report findings.
```

**Competing-hypothesis debug (adversarial):**
```text
Users report the app exits after one message instead of staying connected.
Spawn 5 teammates to investigate different hypotheses. Have them talk to each
other to disprove each other's theories, like a scientific debate.
Update the findings doc with whatever consensus emerges.
```

**Context-rich single specialist:**
```text
Spawn a security reviewer teammate with the prompt: "Review the authentication
module at src/auth/ for security vulnerabilities. Focus on token handling,
session management, and input validation. The app uses JWT tokens stored in
httpOnly cookies. Report any issues with severity ratings."
```

---

## 10. Troubleshooting

- **Teammates not appearing** — check the agent panel (↑/↓ + Enter); idle rows hide after 30s (message by name to revive); confirm the task was complex enough; for split panes verify `which tmux` / `it2` + iTerm2 Python API.
- **Too many permission prompts** — pre-approve common ops in permission settings before spawning.
- **Teammates stop on errors** — open the teammate, give instructions, or spawn a replacement.
- **Lead shuts down early** — tell it to keep going / wait for teammates.
- **Orphaned tmux** — `tmux ls` then `tmux kill-session -t <name>`.

---

## 11. Limitations (experimental)

- **No session resumption with in-process teammates** — `/resume` + `/rewind` don't restore them; lead may message dead teammates → tell it to spawn new ones.
- **Task status can lag** — teammates sometimes don't mark tasks complete, blocking dependents; update manually or nudge.
- **Shutdown can be slow** — teammates finish the current request/tool call first.
- **One team per session.** No additional named teams, no sharing across sessions.
- **No nested teams** — teammates can't spawn teammates; only the lead manages the team.
- **Lead is fixed** — can't promote a teammate or transfer leadership.
- **Permissions set at spawn** (lead's mode); change individually after.
- **Split panes need tmux/iTerm2** — not VS Code terminal / Windows Terminal / Ghostty.

---

## 12. Project notes — Codalyn monorepo

This is a **pnpm + turbo monorepo** (`apps/`, `packages/`, `pnpm-workspace.yaml`). Agent teams fit well here:

- **Package-parallel work** — give each teammate ownership of one package/app directory to avoid file conflicts (`packages/<x>`, `apps/<y>`).
- **Cross-layer features** — one teammate per layer (UI app / shared package / scripts), coordinated by the lead.
- **Monorepo-wide review** — split lenses: types/build, lint (biome), package boundaries, changeset correctness.
- Teammates auto-load root `CLAUDE.md` + `AGENTS.md` from their working dir — keep package-local guidance in package `CLAUDE.md` files so teammates scoped to a package get the right context.
- Pre-approve common monorepo commands (`pnpm`, `turbo`, `biome`) in permission settings before spawning to cut prompt friction.
