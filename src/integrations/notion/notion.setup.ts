import { Client } from '@notionhq/client';

const notionToken = process.env.NOTION_TOKEN;
const parentPageId = process.env.PARENT_PAGE_ID;

if (!notionToken) {
  throw new Error('Missing NOTION_TOKEN in environment.');
}

if (!parentPageId) {
  throw new Error('Missing PARENT_PAGE_ID in environment.');
}

const notion = new Client({ auth: notionToken });

// Properties for the Engineering Logs database (without relation at first).
const engineeringLogsProperties: Record<string, unknown> = {
  Title: {
    title: {},
  },
  'User ID': {
    number: {},
  },
  'Logged At': {
    date: {},
  },
  Content: {
    rich_text: {},
  },
  Scope: {
    multi_select: {
      options: [
        { name: 'API' },
        { name: 'DB' },
        { name: 'Infra' },
        { name: 'MCP' },
        { name: 'Notion' },
        { name: 'CLI' },
        { name: 'Auth' },
        { name: 'Testing' },
      ],
    },
  },
  Decision: {
    rich_text: {},
  },
  Friction: {
    select: {
      options: [
        { name: 'None' },
        { name: 'Low' },
        { name: 'Medium' },
        { name: 'High' },
        { name: 'Blocked' },
      ],
    },
  },
  'Friction Notes': {
    rich_text: {},
  },
  Tags: {
    multi_select: {},
  },
  Origin: {
    select: {
      options: [
        { name: 'cli' },
        { name: 'wordpress' },
        { name: 'telemetry' },
        { name: 'mcp' },
      ],
    },
  },
};

const createEngineeringLogsDatabase = async () => {
  const response = await notion.databases.create({
    parent: {
      type: 'page_id',
      page_id: parentPageId,
    },
    title: [
      {
        type: 'text',
        text: {
          content: 'Engineering Logs',
        },
      },
    ],
    properties: engineeringLogsProperties as any,
  });

  return response;
};

const createJournalSummariesDatabase = async (engineeringDatabaseId: string) => {
  // Properties for Journal Summaries, including a dual relation to Engineering Logs.
  // Notion will auto-create the reciprocal relation property on Engineering Logs.
  const journalSummariesProperties: Record<string, unknown> = {
    Title: {
      title: {},
    },
    'User ID': {
      number: {},
    },
    'Period Start': {
      date: {},
    },
    'Period End': {
      date: {},
    },
    'Summary HTML': {
      rich_text: {},
    },
    'Answers JSON': {
      rich_text: {},
    },
    'Summary Status': {
      select: {
        options: [{ name: 'Draft' }, { name: 'Ready' }, { name: 'Published' }],
      },
    },
    'Engineering Logs': {
      relation: {
        database_id: engineeringDatabaseId,
        type: 'dual_property',
        dual_property: {
          synced_property_name: 'Journal Link',
        },
      },
    },
    Origin: {
      select: {
        options: [{ name: 'wordpress' }, { name: 'mcp' }],
      },
    },
  };

  const response = await notion.databases.create({
    parent: {
      type: 'page_id',
      page_id: parentPageId,
    },
    title: [
      {
        type: 'text',
        text: {
          content: 'Journal Summaries',
        },
      },
    ],
    properties: journalSummariesProperties as any,
  });

  return response;
};

const main = async () => {
  console.log('Creating Notion databases under parent page:', parentPageId);

  const engineeringDb = await createEngineeringLogsDatabase();
  console.log('Created Engineering Logs DB:', engineeringDb.id);

  const journalDb = await createJournalSummariesDatabase(engineeringDb.id);
  console.log('Created Journal Summaries DB:', journalDb.id);

  console.log('Relation established via Journal Summaries -> Engineering Logs (dual_property).');
  console.log('Reciprocal property name on Engineering Logs: Journal Link');
  console.log('Setup complete.');
};

main().catch((error) => {
  console.error('Notion setup failed:', error);
  process.exit(1);
});
