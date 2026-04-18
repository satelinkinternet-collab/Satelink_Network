# /satelink-stage
Marks all tasks in current stage as complete and advances PROGRESS.md to next stage.

Steps:
1. Read current stage from PROGRESS.md
2. Confirm all tasks in stage are DONE
3. If not: print what's still PENDING, stop
4. If all DONE: update PROGRESS.md stage header to COMPLETE
5. Print next stage name and first task
