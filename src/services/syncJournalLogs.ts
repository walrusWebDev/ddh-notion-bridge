import { SyncJournalLogsService } from './logs/sync-journal-logs.service.js';

export const syncLatestJournalLogs = async (userId: number, limit = 5) => {
	const service = new SyncJournalLogsService();
	return service.syncLatestJournalLogs(userId, { limit });
};