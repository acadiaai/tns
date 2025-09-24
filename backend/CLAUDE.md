# Development Setup

## Tmux Configuration

We use tmux for managing development processes:

### Window Layout
- Window 0: Backend (`GORM_LOG_LEVEL=info go run cmd/server/main.go`)
- Window 1: Frontend (`npm run dev`)
- Window 2: Development/Testing

### Key Commands
```bash
# List tmux sessions
tmux ls

# Switch to window
Ctrl-b [window-number]

# Kill current pane/process
Ctrl-c (in pane)
```

## Database Management
- Database file: `therapy.db`
- Backup before major changes: `cp therapy.db therapy_$(date +%Y%m%d_%H%M%S).db`
- Move aside for fresh migrations: `mv therapy.db therapy_aside_$(date +%Y%m%d_%H%M%S).db`

### Fresh Test Process
1. Move database aside: `mv therapy.db therapy_aside_$(date +%Y%m%d_%H%M%S).db`
2. Restart air in tmux window 2: `Ctrl-c` then `air`
3. Air will auto-rebuild with fresh database and run migrations

### Complete Fresh Test Checklist
When doing a fresh test after code changes:
1. ✅ Move database aside for fresh start
2. ✅ Review and update prompts if needed (especially workflow instructions)
3. ✅ Fix any logging issues (e.g., from_phase showing wrong value)
4. ✅ Add debug logging for problem areas
5. ✅ Check for unexpected auto-transition logic
6. ✅ Fix ready_to_transition calculation (must check ALL collected data for phase, not just current call)
7. ✅ Document changes in CLAUDE.md
8. ✅ Restart air with fresh database

The system is ready when air rebuilds with fresh migrations!

## Testing
- Frontend runs on port 5173
- Backend API on port 8080
- Use Playwright for end-to-end testing