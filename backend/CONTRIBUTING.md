# Contributing to Therapy Navigation System

## Development Workflow

### 1. Identify Issue
- Run therapy session via Playwright testing
- Observe where system fails or behaves incorrectly
- Document specific phase and failure mode

### 2. Create Mini-PRD
```markdown
## Problem
- What's broken (specific phase, tool, or behavior)
- Impact on therapy session flow

## Hypothesis
- Root cause analysis
- Proposed fix

## Success Criteria
- Session progresses through target phases
- No hard errors in target area
- UI updates correctly
```

### 3. Branch & Fix
```bash
# Create feature branch
git checkout -b fix/[specific-issue]

# Make targeted fixes
# Test hypothesis with session run
```

### 4. Test Session
```bash
# Backup database
cp therapy.db therapy_$(date +%Y%m%d_%H%M%S).db

# Move aside for fresh run
mv therapy.db therapy_aside_$(date +%Y%m%d_%H%M%S).db

# Run full session test via Playwright
# Goal: Progress as far as possible until hard error
```

### 5. Evaluate & Iterate

#### If Fix Works:
1. Commit with clear message
2. Merge to main
3. Identify next bottleneck
4. Repeat process

#### If Fix Fails:
1. Analyze new failure mode
2. Refine hypothesis
3. Iterate on same branch
4. Re-test

### 6. Merge Criteria
- Session progresses further than before
- No regression in earlier phases
- Clean hard errors (no silent failures)

## Key Principles

1. **Incremental Progress**: Each PR should move session forward
2. **Hard Errors**: Fail fast and loud - no silent failures
3. **Test-Driven**: Every fix validated by running actual session
4. **Database-Driven**: Requirements and phases defined in database
5. **Universal Tools**: MCP tools work across all phases

## Testing Protocol

1. Start fresh (new database)
2. Run complete session attempt
3. Document phase reached
4. Note specific failure
5. Create targeted fix
6. Re-test from clean state

## Current Focus Areas

- Phase progression reliability
- UI reactivity and updates
- Tool execution consistency
- Data collection and validation
- State machine transitions