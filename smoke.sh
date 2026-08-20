#!/usr/bin/env bash
# ATLAS smoke test — exercises every endpoint against a running instance.
#
#   npm run dev          # in one terminal
#   bash smoke.sh        # in another (or: npm run smoke)
#
# Doubles as living documentation: every check below is a copy-pasteable
# example of how to call that endpoint. Needs only bash + curl (no jq).

BASE_URL="${ATLAS_BASE_URL:-http://localhost:4102}"
PASS=0
FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" == *"$expected"* ]]; then
    echo "PASS  $name"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $name"
    echo "      expected to contain: $expected"
    echo "      got: ${actual:0:300}"
    FAIL=$((FAIL + 1))
  fi
}

echo "ATLAS smoke test against $BASE_URL"
echo "────────────────────────────────────────────────────────"

# 1. Liveness.
HEALTH=$(curl -s "$BASE_URL/api/health")
check "GET  /api/health responds"            '"status":"ok"'              "$HEALTH"
check "GET  /api/health names the service"   '"service":"atlas-incident-map"' "$HEALTH"

# 2. Seeded data: a fresh clone must already show a living campus.
POINTS=$(curl -s "$BASE_URL/api/points")
check "GET  /api/points returns seeds"       '"count":'                   "$POINTS"
check "GET  /api/points includes a P0 seed"  '"severity":"P0"'            "$POINTS"

# 3. Category filtering.
FIRES=$(curl -s "$BASE_URL/api/points?category=fire")
check "GET  /api/points?category=fire filters" '"category":"fire"'        "$FIRES"
BAD_CAT=$(curl -s "$BASE_URL/api/points?category=volcano")
check "GET  /api/points rejects bad category" '"error"'                   "$BAD_CAT"

# 4. Creating a point.
CREATED=$(curl -s -X POST "$BASE_URL/api/points" \
  -H 'Content-Type: application/json' \
  -d '{"lat":20.35192,"lng":85.8203,"category":"medical","severity":"P1","label":"smoke-test incident"}')
check "POST /api/points stores a point"      '"label":"smoke-test incident"' "$CREATED"
INVALID=$(curl -s -X POST "$BASE_URL/api/points" \
  -H 'Content-Type: application/json' -d '{"lat":999,"lng":0,"category":"fire"}')
check "POST /api/points validates input"     '"error":"Validation failed"' "$INVALID"

# 5. Triage engine: a life-threatening description must come back P0…
TRIAGE_P0=$(curl -s -X POST "$BASE_URL/api/triage" \
  -H 'Content-Type: application/json' \
  -d '{"category":"medical","description":"Student collapsed, unconscious and not breathing","reportCount":3}')
check "POST /api/triage escalates to P0"     '"priority":"P0"'            "$TRIAGE_P0"
check "POST /api/triage explains itself"     '"rationale":"Priority P0'   "$TRIAGE_P0"

# …and a mundane one must stay P3.
TRIAGE_P3=$(curl -s -X POST "$BASE_URL/api/triage" \
  -H 'Content-Type: application/json' \
  -d '{"category":"other","description":"Lost water bottle near the library","timeOfDay":14}')
check "POST /api/triage keeps noise at P3"   '"priority":"P3"'            "$TRIAGE_P3"

# 6. Hotspots: seeds cluster around Hostel 9 and Block C on purpose.
HOTSPOTS=$(curl -s "$BASE_URL/api/hotspots?windowDays=7")
check "GET  /api/hotspots finds repeat zones" '"dominantCategory"'        "$HOTSPOTS"
check "GET  /api/hotspots reports the window" '"windowDays":7'            "$HOTSPOTS"

# 7. Stats.
STATS=$(curl -s "$BASE_URL/api/stats")
check "GET  /api/stats counts by severity"   '"bySeverity"'               "$STATS"
check "GET  /api/stats names the backend"    '"storageBackend"'           "$STATS"

# 8. Live stream: listen for 3 seconds, then create a point in parallel and
# expect it to arrive as a point.created SSE frame.
STREAM_FILE=$(mktemp)
curl -s -N --max-time 4 "$BASE_URL/api/events" > "$STREAM_FILE" &
STREAM_PID=$!
sleep 1
curl -s -X POST "$BASE_URL/api/points" \
  -H 'Content-Type: application/json' \
  -d '{"lat":20.3536,"lng":85.8195,"category":"security","severity":"P2","label":"SSE smoke ping"}' > /dev/null
wait "$STREAM_PID" 2>/dev/null
STREAM=$(cat "$STREAM_FILE"; rm -f "$STREAM_FILE")
check "GET  /api/events streams point.created" 'event: point.created'     "$STREAM"
check "GET  /api/events frames carry ids"      'id: '                     "$STREAM"

echo "────────────────────────────────────────────────────────"
echo "$PASS passed, $FAIL failed"
[[ "$FAIL" -eq 0 ]] || exit 1
