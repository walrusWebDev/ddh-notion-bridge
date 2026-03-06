#!/usr/bin/env bash
set -euo pipefail

# Always run from repo root regardless of caller cwd.
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Keep shell startup noise out of stdout for MCP stdio transport.
# Do not print anything here.

# Optional: reduce Node runtime warning noise (warnings are typically stderr).
export NODE_NO_WARNINGS=1

# Replace shell with the MCP server process so only Node owns stdio.
exec node dist/mcp/server.js
