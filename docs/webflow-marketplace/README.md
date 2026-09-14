# Webflow Marketplace review — Beacon

| You want to… | Open |
| --- | --- |
| **Submit or respond to Webflow right now** (copy-paste, one heading per form field) | [SUBMIT.md](SUBMIT.md) |
| Run the whole submission process (build → checks → Preflight → form) | [playbook.md](playbook.md) |
| Look up why something was done, what a scanner flagged, artifact hashes per round | [compliance-record.md](compliance-record.md) |
| See what was pasted in earlier rounds | [history/responses.md](history/responses.md) |
| The 2026-08-19 formal resubmission packet | [history/2026-08-19-resubmission-packet.md](history/2026-08-19-resubmission-packet.md) |

Rules of the folder:

- `SUBMIT.md` holds **only** the current round's paste-ready text and file paths. No history, no
  rationale. Update it when a new build is made; move the replaced response body to
  `history/responses.md`.
- `compliance-record.md` is append-only (`### R<n>.<m>` entries). Artifact zip names written there
  are what keeps a build out of the retention prune (`scripts/build-cli.mjs`).
- Skills that drive the process: `/webflow-app-preflight` (gate) and
  `/webflow-app-review-remediation` (findings loop), in `.claude/skills/` and `.cursor/skills/`.
