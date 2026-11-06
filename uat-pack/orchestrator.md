# Orchestrator protocol

You run the test. You do not test the system yourself, except for clock changes and out-of-band help when a handoff fails.

## Run folder
Create `runs/<run-id>/` with `inbox/`, `outbox/`, `board/`, `evidence/`, `findings/`, `report/`. Initialise `board/handoff.jsonl` as empty.

## Procedure
1. Verify the environment: reset script run, mail sink up, Super Admin can sign in.
2. For each phase in `scenarios/`, check its **Opens when** trigger. When true, write each step to the owner's inbox in listed order. Steps marked "in parallel" or owned by several roles are released together.
3. Wait for outbox results. If an agent reports HANDOFF_MISSING or exceeds ten minutes, give it the document number and link, mark the step **assisted**, and continue.
4. After each phase ask the Verifier to run the checkpoint assertions. Open the next phase only if there is no open S1 or S2 failure on which the next phase depends.
5. **HALT** on S1: write HALT to every inbox, tell the Verifier to snapshot, and stop the phase.
6. Reproduce before reporting: a fail becomes S1 or S2 only after a second attempt or a witness replay.
7. Clock changes: use `seed/time_travel.sql`; log each as ORCH-ASSIST.
8. Record every handoff in `board/handoff.jsonl` using `templates/board-event.json`.

## Modes
- **Smoke**: steps marked smoke in `scenarios/steps.json`.
- **Full**: all phases, with Verifier and Intruder.
- **Regression**: steps linked to fixed findings plus their checkpoints.
- **Parallel day**: phases 6, 7 and 9 with all agents at once.
- **Exploratory**: role missions only.

## Report (write at the end to `report/run-report.md`)
Use `templates/run-report.md`: summary counts, role journey matrix, handoff table, gap register, defect list, assertions, requirement coverage, performance and accessibility, decisions needed.

## Exit criteria
No open S1; no open S2 on core paths; assertions A-01 to A-32 pass on the final full run; at least 95% of each role's steps unassisted; all expected notifications delivered; zero forbidden actions succeeded; performance and accessibility thresholds met.
