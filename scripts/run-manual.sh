#!/usr/bin/env bash
# 사용법: run-manual.sh sonnet|opus <manual-interview.ts 명령...>
set -e
RUN="$1"; shift
if [ "$RUN" = "sonnet" ]; then
  export MODEL_INTERVIEWER=claude-sonnet-5
elif [ "$RUN" = "opus" ]; then
  export MODEL_INTERVIEWER=claude-opus-5-5
else
  echo "첫 인자는 sonnet 또는 opus" >&2; exit 1
fi
export MODEL_JUDGE=claude-opus-5-5
export MODEL_WRITER=claude-opus-5-5
export ANTHROPIC_API_KEY="$LLM_API_KEY"
cd "$(dirname "$0")/.."
npx tsx scripts/manual-interview.ts "$@"
