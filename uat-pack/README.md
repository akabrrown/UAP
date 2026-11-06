# UAP test pack
Multi-agent, role-based test of the UPSA Assembly Platform on a staging environment.

Contents: `orchestrator.md`, `agents/` (eight role briefs, verifier, intruder), `scenarios/` (125 steps in 14 phases, plus steps.json), `seed/` (CSV files, scopes_expected.json, test-only SQL), `sql/` (assertions), `templates/`.

Start with Smoke mode (steps marked smoke). Read `UAP_07_Multi_Agent_Test_Playbook.docx` first. Use `UAP_06_Screen_Button_Workflow.docx` as the interface contract: agents find controls by those names.

Staging only. Never use production credentials or real personal data.
