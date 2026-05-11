# /resume

Run the RESUME capability from .claude/skills/satelink/SKILL.md

## Steps

1. Read agent/memory/CURRENT_TASK.md (mandatory):
   ```
   cat agent/memory/CURRENT_TASK.md
   ```
   If missing: "No active task. Read PROGRESS.md for next PENDING task."

2. Parse resume state — extract from CURRENT_TASK.md:
   - Task ID (e.g., S0-007, P2-003)
   - Current file being edited
   - Function/line number if checkpointed
   - Last completed step

3. Verify state:
   - Check the file still exists
   - Verify line numbers are valid
   - Read surrounding context

4. Continue from exact point:
   - Do NOT restart from scratch
   - Do NOT re-read files already summarized in CURRENT_TASK.md

5. After meaningful progress, update CURRENT_TASK.md with new position.

## Anti-patterns (REJECT)
- Starting fresh when CURRENT_TASK.md exists
- Re-analyzing files already documented
- Clearing CURRENT_TASK.md without completing task
