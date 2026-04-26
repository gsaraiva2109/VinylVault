#!/bin/bash
# Runs cargo check and parses the JSON output into a dense, token-friendly format
# Optimized for AIDD (AI-Driven Development)

# Navigate to backend root
cd "$(dirname "$0")/.." || exit

# Run cargo check with JSON output
# 1. Filter for reasons with messages
# 2. Extract [Code] Message -> File:Path Line:Num
# 3. Handle primary spans and nested suggestions if available
cargo check --message-format=json --quiet 2>/dev/null | jq -r '
  select(.reason == "compiler-message") |
  .message |
  "[\(.code.code // "WARN")] \(.message) -> File: \(.spans[0].file_name // "unknown") Line: \(.spans[0].line_start // "0")"
' | sort | uniq
