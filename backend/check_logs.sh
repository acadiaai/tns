#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== THERAPY NAVIGATION SYSTEM LOG ANALYSIS ===${NC}"
echo -e "${BLUE}Timestamp: $(date)${NC}\n"

# Check backend status
echo -e "${YELLOW}1. Backend Process Status:${NC}"
if lsof -i :8083 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running on port 8083${NC}"
    lsof -i :8083 | head -3
else
    echo -e "${RED}✗ Backend is NOT running on port 8083${NC}"
fi

# Check for recent backend errors
echo -e "\n${YELLOW}2. Recent Backend Errors (last 10):${NC}"
grep -E "ERROR|FATAL|PANIC" /Users/acadiaai/projects/therapy-navigation-system/logs/backend.log 2>/dev/null | tail -10 || echo "No errors found"

# Check for WebSocket connections
echo -e "\n${YELLOW}3. Recent WebSocket Activity:${NC}"
grep -i "websocket" /Users/acadiaai/projects/therapy-navigation-system/logs/backend.log 2>/dev/null | tail -5

# Check for session creation
echo -e "\n${YELLOW}4. Recent Session Creation:${NC}"
grep -E "session.*created|Creating.*session" /Users/acadiaai/projects/therapy-navigation-system/logs/backend.log 2>/dev/null | tail -5

# Check for phase transitions
echo -e "\n${YELLOW}5. Recent Phase Transitions:${NC}"
grep -E "phase.*transition|TRANSITION|transitioning" /Users/acadiaai/projects/therapy-navigation-system/logs/backend.log 2>/dev/null | tail -5

# Check for MCP tool calls
echo -e "\n${YELLOW}6. Recent MCP Tool Calls:${NC}"
grep -E "MCP.*tool|therapy_session_transition|Tool.*executed" /Users/acadiaai/projects/therapy-navigation-system/logs/backend.log 2>/dev/null | tail -5

# Check for AI/Coach activity
echo -e "\n${YELLOW}7. Recent AI Coach Activity:${NC}"
grep -E "Coach|GenerateResponse|Gemini" /Users/acadiaai/projects/therapy-navigation-system/logs/backend.log 2>/dev/null | tail -5

# Check prompt logs for AI behavior
echo -e "\n${YELLOW}8. Recent Prompt Activity (last 3):${NC}"
if [ -f /Users/acadiaai/projects/therapy-navigation-system/logs/prompts.jsonl ]; then
    tail -3 /Users/acadiaai/projects/therapy-navigation-system/logs/prompts.jsonl | while IFS= read -r line; do
        echo "$line" | jq -r '"\(.timestamp): Phase=\(.phase), Type=\(.prompt_type)"' 2>/dev/null || echo "$line"
    done
else
    echo "No prompt log file found"
fi

# Check frontend status
echo -e "\n${YELLOW}9. Frontend Process Status:${NC}"
if lsof -i :5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running on port 5173${NC}"
elif lsof -i :5174 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running on port 5174${NC}"
else
    echo -e "${RED}✗ Frontend is NOT running${NC}"
fi

# Check database for recent messages
echo -e "\n${YELLOW}10. Recent Database Activity:${NC}"
if [ -f /Users/acadiaai/projects/therapy-navigation-system/backend/therapy.db ]; then
    echo "Recent messages count:"
    sqlite3 /Users/acadiaai/projects/therapy-navigation-system/backend/therapy.db "SELECT COUNT(*) as count, datetime(created_at) as time FROM messages WHERE created_at > datetime('now', '-5 minutes') GROUP BY strftime('%M', created_at) ORDER BY created_at DESC LIMIT 5;" 2>/dev/null || echo "Could not query database"
else
    echo "Database file not found"
fi

echo -e "\n${BLUE}=== END OF LOG ANALYSIS ===${NC}"