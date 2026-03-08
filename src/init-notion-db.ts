import './config/env.js';
import { notionClient as notion } from './services/notion/NotionClient.js';

async function updateEngineeringDb() {
  const databaseId = process.env.ENGINEERING_LOGS_DB_ID;

  if (!databaseId) {
    throw new Error('Missing ENGINEERING_LOGS_DB_ID in environment.');
  }

  // 1. First, retrieve the database to find the name of the current "title" property
  const db = await notion.databases.retrieve({ database_id: databaseId });
  const properties = db.properties ?? {};
  const titleKey =
    Object.keys(properties).find((key) => properties[key]?.type === 'title') ??
    'title';

  // 2. Update the schema
  await notion.databases.update({
    database_id: databaseId,
    properties: {
      [titleKey]: { name: 'Name' }, // Rename the existing title column to "Name"
      PostgresID: { number: {} },
      Scope: {
        select: {
          options: [
            { name: 'api' },
            { name: 'cli' },
            { name: 'database' },
            { name: 'docker' },
            { name: 'auth' },
            { name: 'refactor' },
            { name: 'docs' },
            { name: 'feature' },
          ],
        },
      },
      Decision: { rich_text: {} },
      Rationale: { rich_text: {} },
      Friction: { rich_text: {} },
      Tags: { multi_select: {} },
      Date: { date: {} },
    },
  });
  console.log('✅ Engineering Database schema updated safely!');
}

updateEngineeringDb().catch((error) => {
  console.error('❌ Failed to update Engineering Logs database:', error);
  process.exit(1);
});
