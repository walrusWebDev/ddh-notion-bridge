import '../config/env.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { syncLatestEngineeringLogs } from '../services/logs/sync-engineering-logs.service.js';
import { syncLatestJournalLogs } from '../services/logs/sync-journal-logs.service.js';

const LIMIT_MIN = 1;
const LIMIT_MAX = 250;
const DEFAULT_LIMIT = 5;

const server = new McpServer({
	name: 'Daily Dev Bridge',
	version: '1.0.0',
});

const syncInputSchema = {
	userId: z.number().int().positive().describe('User ID in PostgreSQL.'),
	limit: z
		.number()
		.int()
		.min(LIMIT_MIN)
		.max(LIMIT_MAX)
		.optional()
		.describe(`Optional number of rows to sync (${LIMIT_MIN}-${LIMIT_MAX}).`),
};

server.registerTool(
	'sync_engineering_logs',
	{
		description: 'Sync latest engineering_logs rows into the Engineering Logs Notion database.',
		inputSchema: syncInputSchema,
	},
	async ({ userId, limit }) => {
		const result = await syncLatestEngineeringLogs(userId, limit ?? DEFAULT_LIMIT);

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							tool: 'sync_engineering_logs',
							userId,
							limit: limit ?? DEFAULT_LIMIT,
							result,
						},
						null,
						2
					),
				},
			],
		};
	}
);

server.registerTool(
	'sync_journal_logs',
	{
		description: 'Sync latest journal_logs rows into the Journal Summaries Notion database.',
		inputSchema: syncInputSchema,
	},
	async ({ userId, limit }) => {
		const result = await syncLatestJournalLogs(userId, limit ?? DEFAULT_LIMIT);

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							tool: 'sync_journal_logs',
							userId,
							limit: limit ?? DEFAULT_LIMIT,
							result,
						},
						null,
						2
					),
				},
			],
		};
	}
);

export const startMcpServer = async () => {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error('MCP Server Started');
};

if (import.meta.url === `file://${process.argv[1]}`) {
	startMcpServer().catch((error) => {
		console.error('MCP server failed to start:', error);
		process.exit(1);
	});
}
