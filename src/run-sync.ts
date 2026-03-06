// src/run-sync.ts
import { syncLatestEngineeringLogs } from './services/logs/sync-engineering-logs.service.js';
import { syncLatestJournalLogs } from './services/logs/sync-journal-logs.service.js'; // New

async function run() {
  const USER_ID = 1; // Your Bridges user ID
  
  console.log('🚀 Syncing full history to Notion...');
  
  try {
    // Sync last 50 Engineering Logs
    const engResult = await syncLatestEngineeringLogs(USER_ID, 50);
    console.log('💻 Engineering Stream:', engResult);

    // Sync last 20 Journal Entries
    const journalResult = await syncLatestJournalLogs(USER_ID, 20);
    console.log('📝 Journal Stream:', journalResult);

  } catch (error) {
    console.error('❌ Sync Failed:', error);
  } finally {
    process.exit();
  }
}

run();