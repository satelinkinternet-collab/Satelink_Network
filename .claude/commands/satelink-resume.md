# /satelink-resume
Reads CURRENT_TASK.md and resumes exactly where the last session stopped.

Steps:
1. cat agent/memory/CURRENT_TASK.md — if missing, print "No active task. Use /satelink-status to find next task."
2. Read the exact resume state (file, function, line number if available)
3. Continue implementation from that exact point
4. Do not restart from scratch
