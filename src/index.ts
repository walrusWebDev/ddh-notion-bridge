import { startMcpServer } from './mcp/server.js';

// This actually kicks off the process Claude is looking for
startMcpServer().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});