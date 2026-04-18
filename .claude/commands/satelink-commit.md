# /satelink-commit
Formats commit message using current task ID and pushes to feature branch.

Steps:
1. Read current task ID from agent/memory/CURRENT_TASK.md
2. git add -A
3. git commit -m "feat(TASK-ID): [description from CURRENT_TASK.md]"
4. git push origin [current branch]
5. Update PROGRESS.md task status to DONE
6. Delete CURRENT_TASK.md (task complete)
