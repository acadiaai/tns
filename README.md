# Therapy Navigation System

## Overview

An AI-powered brainspotting therapy navigation system with automated phase transitions, real-time data collection, and structured therapeutic workflows. Built with Go backend serving React frontend in a unified container deployment.

## Key Features

- **10-Phase Therapy Workflow**: Automated progression through brainspotting therapy phases
- **MCP Integration**: Model Context Protocol for structured AI data collection
- **Auto-Transition System**: Breakthrough feature - phases transition automatically when requirements met
- **Real-time UI**: WebSocket-powered live updates of session progress
- **Persistent Data**: SQLite with Cloud Storage backup system
- **Always-On Deployment**: Cloud Run with min-instances for zero cold starts

## Architecture

### Unified Container Design
- **Frontend**: React + TypeScript + Vite (embedded in Go binary)
- **Backend**: Go + Gin + GORM + SQLite
- **Deployment**: Single Docker container serving both frontend and API
- **Benefits**: No CORS issues, simplified deployment, relative API paths

### Technology Stack
- **Backend**: Go 1.23, Gin HTTP framework, GORM ORM, SQLite database
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite build tool
- **AI Integration**: Gemini API with MCP tools, WebSocket real-time communication
- **Deployment**: Docker + Google Cloud Run with persistent storage backup
- **Authentication**: Firebase Auth integration

## Quick Start

### Development Setup
```bash
# Terminal 1: Backend
cd backend
GORM_LOG_LEVEL=info go run cmd/server/main.go

# Terminal 2: Frontend
cd frontend
npm run dev

# Visit: http://localhost:5173
```

### Production Deployment
```bash
# Build and deploy to Cloud Run
docker build -t therapy-app .
gcloud run deploy --image therapy-app --min-instances=1
```

## Core Breakthrough: Auto-Transition System

The revolutionary feature that eliminated AI reliability issues:

**Problem**: AI would collect data but fail to make multiple tool calls to transition phases
**Solution**: Backend automatically transitions when `ready_to_transition: true`

```go
// In collect_structured_data handler
if readyToTransition {
    // Auto-transition internally
    nextPhase := getNextPhase(currentPhase)
    transitionToPhase(sessionID, nextPhase)
}
```

**Result**: 100% reliable phase progression without depending on AI making multiple tool calls.

## API Endpoints

### Core Session Management
- `GET /api/sessions` - List all therapy sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/{id}` - Get session details
- `GET /api/sessions/{id}/ws` - WebSocket connection for real-time updates

### MCP Integration
- `POST /api/mcp` - Model Context Protocol tool execution
- `GET /api/sessions/{id}/prompts` - Debug: View AI prompts
- `GET /api/sessions/{id}/prompts/raw` - Debug: Raw prompt log

### Workflow Management
- `GET /api/phases` - Get all therapy phases
- `GET /api/phase-data/{phaseId}` - Get phase requirements and data

## Database Schema

### Core Models
```go
type Session struct {
    ID          string    `json:"id" gorm:"primaryKey"`
    ClientID    string    `json:"client_id"`
    TherapistID string    `json:"therapist_id"`
    StartTime   time.Time `json:"start_time"`
    Status      string    `json:"status"`
}

type WorkflowStatus struct {
    SessionID     string `json:"session_id" gorm:"primaryKey"`
    CurrentPhase  string `json:"current_phase"`
    Progress      int    `json:"progress"`
}

type PhaseData struct {
    PhaseID       string `json:"phase_id" gorm:"primaryKey"`
    SessionID     string `json:"session_id" gorm:"primaryKey"`
    DataCollected string `json:"data_collected"`
    IsComplete    bool   `json:"is_complete"`
}
```

## MCP Tools (Gemini Integration)

### Available Tools
1. **collect_structured_data**: Collects phase-specific data, auto-transitions when ready
2. **get_phase_context**: Returns current phase requirements and context
3. **therapy_session_transition**: Manual phase transition (rarely needed due to auto-transition)

### Tool Flow Example
```typescript
// AI calls collect_structured_data
{
  "session_id": "abc123",
  "data": {
    "consent_given": true
  }
}

// Backend response triggers auto-transition
{
  "success": true,
  "ready_to_transition": true,
  "auto_transition_success": true,
  "transitioned_to": "issue_decision"
}
```

## 10-Phase Therapy Workflow

1. **Pre-Session**: Consent and rapport building
2. **Issue Decision**: Identify focus issue and intensity
3. **Information Gathering**: Collect detailed context
4. **Resource Assessment**: Evaluate client resources
5. **Eye Position Setup**: Find optimal brainspot
6. **Processing Phase**: Core therapeutic processing
7. **Body Awareness**: Somatic tracking
8. **Integration**: Consolidate insights
9. **Closing Preparation**: Session wrap-up
10. **Session Completion**: Final integration

## Deployment Architecture

### Cloud Run Configuration
```bash
# Always-warm deployment (no cold starts)
gcloud run deploy tns-backend \
  --image us-central1-docker.pkg.dev/therapy-nav-poc-quan/tns-repo/tns-combined:latest \
  --min-instances=1 \
  --region=us-central1
```

### Domain Setup
- **Production**: https://tns.acadia.sh
- **Direct**: https://tns-backend-385615458061.us-central1.run.app
- **SSL**: Managed by Google Cloud Run

### Data Persistence
SQLite database with Cloud Storage backup:
- **Startup**: Download latest backup from Cloud Storage
- **Runtime**: Periodic backups every 5 minutes
- **Shutdown**: Final backup on graceful shutdown
- **Cost**: ~$0.02/GB/month (virtually free for development)

## Key Files

### Backend Core
- `cmd/server/main.go` - Application entry point
- `internal/api/router.go` - HTTP routes and static file serving
- `internal/api/handlers.go` - API endpoint handlers
- `internal/mcp/hardcoded_tools.go` - MCP tool implementations with auto-transition
- `internal/repository/models.go` - Database models and schema
- `internal/storage/backup.go` - Cloud Storage backup system

### Frontend Core
- `src/components/TherapyNavigationSystem.tsx` - Main application component
- `src/components/SessionsManagement.tsx` - Session list and management
- `src/components/WorkflowStudio.tsx` - Real-time phase progress visualization
- `src/config/api.ts` - API configuration (relative paths for unified deployment)

### Configuration
- `Dockerfile` - Multi-stage build (React → Go → unified container)
- `go.mod` - Go dependencies including Cloud Storage client
- `package.json` - Frontend dependencies and build scripts

## Development Workflow

### Local Development
```bash
# Backend (tmux window 0)
cd backend && air  # Hot reload

# Frontend (tmux window 1)
cd frontend && npm run dev

# Testing (tmux window 2)
# Create test sessions, debug workflows
```

### Database Management
```bash
# Fresh start
mv therapy.db therapy_aside_$(date +%Y%m%d_%H%M%S).db

# Air auto-rebuilds with fresh migrations
# Check logs for migration success
```

### Deployment Process
```bash
# 1. Build frontend
cd frontend && npm run build

# 2. Build and push container
docker buildx build --platform linux/amd64 -t IMAGE_URL .
docker push IMAGE_URL

# 3. Deploy to Cloud Run
gcloud run deploy tns-backend --image IMAGE_URL

# 4. Test deployment
curl https://tns.acadia.sh/health
```

## Environment Variables

### Required
- `GEMINI_API_KEY` - Gemini API access for MCP tools
- `GOOGLE_APPLICATION_CREDENTIALS` - Cloud Storage access (JSON key path)
- `DATABASE_URL` - Optional: PostgreSQL for production (defaults to SQLite)

### Optional
- `PORT` - Server port (default: 8083)
- `GORM_LOG_LEVEL` - Database query logging level
- `NODE_ENV` - Environment mode

## Troubleshooting

### Common Issues
1. **Cold Starts**: Use `--min-instances=1` on Cloud Run
2. **CORS Errors**: Ensure using relative API paths in frontend
3. **Sessions Not Showing**: Check client/therapist ID matching in database
4. **Prompt Logs Missing**: Check file paths exist or handler returns empty gracefully

### Debug Endpoints
- `GET /health` - Service health check
- `GET /api/sessions/{id}/prompts/raw` - View complete AI interaction log
- WebSocket console logs show real-time session updates

## License

MIT License - See LICENSE file for details

---

**Status**: Production-ready with always-warm Cloud Run deployment, real-time features, and reliable auto-transition workflow system.