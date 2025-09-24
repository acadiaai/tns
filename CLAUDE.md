# Therapy Navigation System - Development Guide

## Project Overview
A brainspotting therapy navigation system with AI-powered coaching and automated phase transitions.

## Key Breakthroughs

### 🎉 Auto-Transition System (2025-09-19)
Successfully implemented automatic phase transitions that eliminate the need for AI to make multiple tool calls:

**Problem**: AI was collecting required data but not transitioning phases, causing workflow to stall.

**Solution**: Added auto-transition logic in `collect_structured_data` tool:
- When all phase requirements are met (`ready_to_transition: true`)
- Backend automatically calls `therapy_session_transition` internally
- No dependency on AI making multiple tool calls in single response

**Files Modified**:
- `backend/internal/mcp/hardcoded_tools.go` - Added auto-transition logic
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
- Window 0: Backend (Air hot reload)
- Window 1: Frontend (`npm run dev`)
- Window 2: Development/Testing

### Database Management
- Fresh start: `mv therapy.db therapy_aside_$(date +%Y%m%d_%H%M%S).db`
- Air auto-rebuilds with fresh migrations

### Testing Workflow
1. Start fresh session via "🧠 Quick Coach Session"
2. Use realistic, vulnerable client responses
3. Observe auto-transitions in real-time
4. Check logs for transition success/failure

## Current Status
- ✅ Pre-session → Issue Decision: Working
- 🔄 Issue Decision → Information Gathering: In Progress
- ⏳ Remaining 8 phases: Pending

## Next Steps
1. Debug transition failure in issue_decision phase
2. Test complete 10-phase workflow progression
3. Refine therapeutic prompts for realism