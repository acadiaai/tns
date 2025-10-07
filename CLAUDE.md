# Therapy Navigation System - Development Guide

## Project Overview
A brainspotting therapy navigation system with AI-powered coaching and automated phase transitions.

## Key Breakthroughs

### 🎉 Auto-Transition System (2025-09-19)
Successfully implemented automatic phase transitions that eliminate the need for AI to make multiple tool calls:

**Problem**: AI was collecting required data but not transitioning phases, causing workflow to stall.

**Solution**: Added auto-transition logic in `collect_structured_data` tool:
- When all phase requirements are met (`ready_to_transition: true`)
- Backend automatically calls transition internally
- No dependency on AI making multiple tool calls in single response

**Files Modified**:
- `backend/internal/mcp/server.go` - Added auto-transition logic
- `backend/internal/services/coach.go` - Added FunctionCallingConfig (removed due to Go SDK limitations)

**Results**:
- ✅ Pre-session → Issue Decision transition working
- ✅ Automatic progression when requirements met
- ✅ More reliable than depending on AI multi-tool behavior

### Gemini MCP Integration
- Gemini DOES support multiple function calls (parallel + sequential)
- Go SDK lacks `FunctionCallingConfig` field, but auto-transition compensates
- Hardcoded tools provide reliability while maintaining flexibility

## Architecture

### Backend (`/backend`)
- **Go + Gin + GORM + SQLite**
- **MCP Server**: Model Context Protocol for AI tool integration
- **Auto-Transition**: Phase progression logic in data collection
- **WebSocket**: Real-time updates to frontend

### Frontend (`/frontend`)
- **React + TypeScript + Vite**
- **Real-time UI**: WebSocket integration for live session updates
- **Phase Visualization**: Workflow state machine display

## Development Setup

### Tmux Configuration

We use tmux for managing development processes:

#### Window Layout
- Window 0: Backend (`GORM_LOG_LEVEL=info go run cmd/server/main.go`)
- Window 1: Frontend (`npm run dev`)
- Window 2: Backend/Air hot reload (`air`)

#### Key Commands
```bash
# List tmux sessions
tmux ls

# Switch to window
Ctrl-b [window-number]

# Kill current pane/process
Ctrl-c (in pane)
```

### Database Management
- Database file: `backend/therapy.db`
- Backup before major changes: `cp backend/therapy.db backend/therapy_$(date +%Y%m%d_%H%M%S).db`
- Move aside for fresh migrations: `mv backend/therapy.db backend/therapy_aside_$(date +%Y%m%d_%H%M%S).db`

### Fresh Test Process
1. Move database aside: `mv backend/therapy.db backend/therapy_aside_$(date +%Y%m%d_%H%M%S).db`
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

## Testing Workflow
1. Start fresh session via "🧠 Quick Coach Session"
2. Use realistic, vulnerable client responses
3. Observe auto-transitions in real-time
4. Check logs for transition success/failure

### Ports
- Frontend runs on port 5173
- Backend API on port 8083 (HTTP + WebSocket)
- Use Playwright for end-to-end testing

## E2E Testing Guidelines

### Realistic Patient Dialogue
When testing with Playwright MCP, always use realistic patient responses from `backend/test-scripts/baseline-session.md`.

**DO:**
- Use casual, natural language ("maybe like an 8")
- Let AI guide the process phase by phase
- Provide data ONLY when AI asks for it
- Simulate real patient pacing and responses
- Describe eye positions directionally ("left and up") not as coordinates

**DON'T:**
- Volunteer future-phase technical data ("position -0.3 horizontal, 0.2 vertical")
- Provide all data in one message
- Use synthetic/unrealistic responses that a real patient would never say
- Rush through phases
- Give exact coordinates before AI guides eye position finding

### Regression Testing Process
1. Move database aside: `mv backend/therapy.db backend/therapy_aside_$(date +%Y%m%d_%H%M%S).db`
2. Restart backend: `Ctrl-c` in air window, then `air`
3. Run baseline script from `backend/test-scripts/baseline-session.md`
4. Verify no tool announcements appear in AI responses
5. Verify phases transition correctly
6. Verify data collected matches realistic script

### Why This Matters
Unrealistic test data (like patients saying "position -0.3, 0.2") creates false bugs that don't exist in real therapy sessions. A real patient would never volunteer eye position coordinates - the therapist guides them to find the spot directionally.

Always test with realistic dialogue to ensure we're fixing real bugs, not chasing synthetic edge cases.

### Critical Test Cases
1. **Tool Announcement Bug**: AI must NEVER say "I'm going to collect/gather/record that information"
2. **Same-Phase Transition**: Backend must reject transitions to the same phase
3. **Auto-Transition**: Phases must auto-transition when all requirements met
4. **Casual Language**: AI must recognize "maybe like an 8" as intensity: 8
5. **Working Memory**: AI must not extract future-phase data from conversation history

## Current Status
- ✅ Pre-session → Issue Decision: Working
- ✅ Issue Decision → Information Gathering: Working
- ✅ All 10 phases defined with proper data requirements
- ✅ Phase colors and glass morphism UI restored
- 🔄 Implementing automatic transition messages

## Next Steps
1. Test complete 10-phase workflow progression
2. Verify stage 4-5-6 loop behavior
3. Refine therapeutic prompts for realism