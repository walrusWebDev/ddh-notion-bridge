import '../config/env.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getEngineeringLogs, syncLatestEngineeringLogs } from '../services/logs/sync-engineering-logs.service.js';
import { getJournalLogs, syncLatestJournalLogs } from '../services/logs/sync-journal-logs.service.js';

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

server.registerTool(
	'get_logs_for_analysis',
	{
		description: 'Fetch raw engineering logs from PostgreSQL for technical review.',
		inputSchema: syncInputSchema,
	},
	async ({ userId, limit }) => {
		const logs = await getEngineeringLogs(userId, limit ?? DEFAULT_LIMIT);

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(logs, null, 2),
				},
			],
		};
	}
);

server.registerTool(
	'get_engineering_analysis',
	{
		description: 'Read raw engineering logs for senior developer feedback.',
		inputSchema: syncInputSchema,
	},
	async ({ userId, limit }) => {
		const logs = await getEngineeringLogs(userId, limit ?? DEFAULT_LIMIT);
		return { content: [{ type: 'text', text: JSON.stringify(logs, null, 2) }] };
	}
);

server.registerTool(
	'get_journal_analysis',
	{
		description: 'Read daily reflections and journal entries for growth analysis.',
		inputSchema: syncInputSchema,
	},
	async ({ userId, limit }) => {
		const logs = await getJournalLogs(userId, limit ?? DEFAULT_LIMIT);
		return { content: [{ type: 'text', text: JSON.stringify(logs, null, 2) }] };
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

import express from 'express';

const app = express();
const WEBHOOK_PORT = 3333; // Pick a port that doesn't collide with your other tools

app.post('/webhook/sync', async (req, res) => {
	console.error('🔔 Local Sync Signal Received!');
	try {
		// Trigger both syncs immediately
		await syncLatestEngineeringLogs(1, 5);
		await syncLatestJournalLogs(1, 5);
		res.status(200).json({ status: 'success', message: 'Notion Tables Synced' });
	} catch (err) {
		console.error('❌ Webhook Sync Failed:', err);
		res.status(500).json({ status: 'error' });
	}
});

app.listen(WEBHOOK_PORT, () => {
	console.error(`🚀 Local Webhook Listener active on port ${WEBHOOK_PORT}`);
});
