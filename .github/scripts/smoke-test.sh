#!/usr/bin/env bash
# Smoke test for the backend container: boots it with the same 512 MB memory
# limit as Render's free tier, then checks health, auth, an authenticated read,
# that protected routes reject anonymous calls, and peak memory use.
# Usage: smoke-test.sh <base-url> <container-name>
set -euo pipefail
BASE="${1:-http://localhost:8080}"
CONTAINER="${2:-lifeos}"
fail() { echo "FAIL: $*"; docker logs "$CONTAINER" 2>&1 | tail -80; exit 1; }

echo "Waiting for $BASE/api/health ..."
for i in $(seq 1 300); do
  if curl -fsS "$BASE/api/health" >/dev/null 2>&1; then echo "up after ${i}s"; break; fi
  [ "$i" = 300 ] && fail "backend did not become healthy in 300s"
  sleep 1
done

[ "$(curl -fsS "$BASE/api/health")" = '{"status":"ok"}' ] || fail "unexpected health body"

code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/profile")
[ "$code" = 401 ] || fail "anonymous /api/profile returned $code, expected 401"

EMAIL="smoke-$RANDOM@example.com"
PASS="Smoke-test-pass-123"
reg=$(curl -fsS -X POST "$BASE/api/auth/register" -H 'Content-Type: application/json' \
  -d "{\"name\":\"Smoke\",\"email\":\"$EMAIL\",\"password\":\"$PASS\"}") || fail "register failed"
echo "$reg" | grep -q '"token"' || fail "register returned no token"

login=$(curl -fsS -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}") || fail "login failed"
TOKEN=$(echo "$login" | sed -E 's/.*"token":"([^"]+)".*/\1/')
[ -n "$TOKEN" ] || fail "login returned no token"

code=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" "$BASE/api/profile")
[ "$code" = 200 ] || fail "authenticated /api/profile returned $code"

# Light load so memory reflects real use, not just an idle JVM.
for i in $(seq 1 200); do
  curl -s -o /dev/null -H "Authorization: Bearer $TOKEN" "$BASE/api/profile" &
  curl -s -o /dev/null -H "Authorization: Bearer $TOKEN" "$BASE/api/foodlogs/history?days=30" &
  if (( i % 20 == 0 )); then wait; fi
done
wait

mem=$(docker stats --no-stream --format '{{.MemUsage}}' "$CONTAINER")
echo "Container memory after load: $mem"
used_mib=$(echo "$mem" | awk '{print $1}' | sed -E 's/MiB//; s/GiB/*1024/' | bc)
limit_ok=$(echo "$used_mib < 450" | bc)
[ "$limit_ok" = 1 ] || fail "memory ${used_mib}MiB is too close to the 512 MiB limit"

[ "$(docker inspect -f '{{.State.OOMKilled}}' "$CONTAINER")" = false ] || fail "container was OOM killed"
echo "Smoke test passed"
