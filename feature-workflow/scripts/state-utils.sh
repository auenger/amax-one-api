#!/usr/bin/env bash
# State utilities for feature-workflow dev-agent loop
# Manages workflow-state.json for cross-worktree coordination

STATE_DIR="$HOME/.claude/projects/-Users-ryan-mycode-AIHub"
STATE_FILE="$STATE_DIR/workflow-state.json"

# Ensure state directory exists
mkdir -p "$STATE_DIR"

state_init() {
  cat > "$STATE_FILE" <<'STATEJSON'
{
  "version": 1,
  "loop": { "active": true, "status": "dispatching", "started_at": "", "iteration": 1 },
  "agents": {},
  "locks": {}
}
STATEJSON
  # Add timestamp
  if command -v python3 &>/dev/null; then
    python3 -c "
import json, datetime
with open('$STATE_FILE', 'r') as f:
    s = json.load(f)
s['loop']['started_at'] = datetime.datetime.now().isoformat()
with open('$STATE_FILE', 'w') as f:
    json.dump(s, f, indent=2)
"
  fi
  echo "State initialized: $STATE_FILE"
}

state_cleanup() {
  if [[ -f "$STATE_FILE" ]]; then
    rm -f "$STATE_FILE"
    echo "State cleaned up: $STATE_FILE"
  fi
}

state_loop_status() {
  local status="$1"
  python3 -c "
import json
with open('$STATE_FILE', 'r') as f:
    s = json.load(f)
s['loop']['status'] = '$status'
with open('$STATE_FILE', 'w') as f:
    json.dump(s, f, indent=2)
"
}

state_loop_iteration() {
  python3 -c "
import json
with open('$STATE_FILE', 'r') as f:
    s = json.load(f)
s['loop']['iteration'] = s['loop'].get('iteration', 0) + 1
with open('$STATE_FILE', 'w') as f:
    json.dump(s, f, indent=2)
"
}

state_agent_register() {
  local id="$1"
  local stage="$2"
  python3 -c "
import json, datetime
with open('$STATE_FILE', 'r') as f:
    s = json.load(f)
s['agents']['$id'] = {
    'status': 'running',
    'stage': '$stage',
    'started_at': datetime.datetime.now().isoformat()
}
with open('$STATE_FILE', 'w') as f:
    json.dump(s, f, indent=2)
"
}

state_agent_stage() {
  local id="$1"
  local stage="$2"
  python3 -c "
import json
with open('$STATE_FILE', 'r') as f:
    s = json.load(f)
if '$id' in s['agents']:
    s['agents']['$id']['stage'] = '$stage'
with open('$STATE_FILE', 'w') as f:
    json.dump(s, f, indent=2)
"
}

state_agent_complete() {
  local id="$1"
  python3 -c "
import json, datetime
with open('$STATE_FILE', 'r') as f:
    s = json.load(f)
if '$id' in s['agents']:
    s['agents']['$id']['status'] = 'completed'
    s['agents']['$id']['completed_at'] = datetime.datetime.now().isoformat()
with open('$STATE_FILE', 'w') as f:
    json.dump(s, f, indent=2)
"
}

state_agent_remove() {
  local id="$1"
  python3 -c "
import json
with open('$STATE_FILE', 'r') as f:
    s = json.load(f)
s['agents'].pop('$id', None)
with open('$STATE_FILE', 'w') as f:
    json.dump(s, f, indent=2)
"
}

state_acquire_lock() {
  local file="$1"
  local holder="$2"
  python3 -c "
import json, datetime, time
with open('$STATE_FILE', 'r') as f:
    s = json.load(f)
locks = s.get('locks', {})
if '$file' in locks and locks['$file'] is not None:
    holder_info = locks['$file']
    # Check for stale lock (5 min timeout)
    locked_at = datetime.datetime.fromisoformat(holder_info.get('locked_at', '2000-01-01'))
    if (datetime.datetime.now() - locked_at).seconds < 300:
        print('LOCKED_BY:' + holder_info.get('holder', 'unknown'))
        exit(1)
# Acquire lock
locks['$file'] = {
    'holder': '$holder',
    'locked_at': datetime.datetime.now().isoformat()
}
s['locks'] = locks
with open('$STATE_FILE', 'w') as f:
    json.dump(s, f, indent=2)
print('LOCK_ACQUIRED')
"
}

state_release_lock() {
  local file="$1"
  python3 -c "
import json
with open('$STATE_FILE', 'r') as f:
    s = json.load(f)
s.get('locks', {}).pop('$file', None)
with open('$STATE_FILE', 'w') as f:
    json.dump(s, f, indent=2)
"
}
