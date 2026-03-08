import { Client } from '@notionhq/client';
import { env } from '../../config/env.js';
import { query } from '../../db/client.js';
import type { JournalLogRow } from '../../db/types/journal-log.js';

// Canonical Notion contract (Journal Summaries DB):
// Name (title), PostgresID (number), Date (date), Origin (select),
// Daily Reflection (rich_text).
// Keep these keys in sync with the Notion database schema to avoid runtime validation errors.
const TITLE_PROPERTY = 'Name';

export interface SyncJournalLogsResult {
  processed: number;
  created: number;
  updated: number;
  failed: number;
}

export class SyncJournalLogsService {
  private notion: Client;
  private journalSummariesDbId: string;

  constructor() {
    if (!env.notionToken) {
      throw new Error('Missing NOTION_TOKEN. Cannot sync journal logs to Notion.');
    }

    if (!env.journalSummariesDbId) {
      throw new Error('Missing JOURNAL_SUMMARIES_DB_ID. Cannot sync journal logs to Notion.');
    }

    this.journalSummariesDbId = env.journalSummariesDbId;
    this.notion = new Client({ auth: env.notionToken });
  }

  async syncLatestJournalLogs(
    userId: number,
    options?: { limit?: number }
  ): Promise<SyncJournalLogsResult> {
    const limit = Number.isFinite(options?.limit)
      ? Math.min(Math.max(Math.trunc(options?.limit ?? 20), 1), 250)
      : 20;

    const logs = await this.findRecentByUser(userId, limit);

    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const log of logs) {
      try {
        const existingPageId = await this.findPageIdByPostgresId(log.id);
        const properties = this.toNotionProperties(log);

        if (existingPageId) {
          await this.notion.pages.update({
            page_id: existingPageId,
            properties: properties as any,
          });
          updated += 1;
        } else {
          await this.notion.pages.create({
            parent: { database_id: this.journalSummariesDbId },
            properties: properties as any,
            children: [
              {
                object: 'block',
                type: 'heading_2',
                heading_2: { rich_text: [{ text: { content: 'Journal Reflection' } }] },
              },
              {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                  rich_text: [
                    {
                      text: {
                        content: this.limitText(log.content_html || 'No content provided.'),
                      },
                    },
                  ],
                },
              },
            ],
          });
          created += 1;
        }
      } catch (error) {
        failed += 1;
        console.error(`❌ Failed to sync journal log ${log.id}:`, error);
      }
    }

    return {
      processed: logs.length,
      created,
      updated,
      failed,
    };
  }

  private async findRecentByUser(userId: number, limit: number): Promise<JournalLogRow[]> {
    const sql = `
      SELECT
        id,
        user_id,
        content_html,
        answers,
        origin,
        created_at
      FROM journal_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2;
    `;

    const { rows } = await query<JournalLogRow>(sql, [userId, limit]);
    return rows;
  }

  private async findPageIdByPostgresId(logId: number): Promise<string | null> {
    const response = await this.notion.databases.query({
      database_id: this.journalSummariesDbId,
      filter: {
        property: 'PostgresID',
        number: {
          equals: logId,
        },
      },
      page_size: 1,
    });

    return response.results[0]?.id ?? null;
  }

  private toNotionProperties(log: JournalLogRow): Record<string, unknown> {
    const createdAt = this.toIsoDate(log.created_at);
    const dateStr = createdAt.split('T')[0] || createdAt;
    const reflectionText = this.buildReflectionText(log.answers);

    return {
      [TITLE_PROPERTY]: {
        title: [{ text: { content: `JOURNAL-${log.id} (${dateStr})` } }],
      },
      PostgresID: {
        number: log.id,
      },
      Date: {
        date: { start: createdAt },
      },
      Origin: {
        select: { name: this.limitText(log.origin || 'wordpress', 100) },
      },
      'Daily Reflection': {
        rich_text: [{ text: { content: this.limitText(reflectionText, 2000) } }],
      },
    };
  }

  private buildReflectionText(answers: JournalLogRow['answers']): string {
    if (!answers) {
      return '';
    }

    if (Array.isArray(answers)) {
      return answers
        .map((item) => {
          if (item && typeof item === 'object') {
            const question = 'question' in item ? String(item.question ?? '') : '';
            const answer = 'answer' in item ? String(item.answer ?? '') : '';
            if (question || answer) {
              return `${question}\n${answer}`.trim();
            }
            return Object.entries(item)
              .map(([k, v]) => `${k}\n${String(v ?? '')}`)
              .join('\n');
          }
          return String(item ?? '');
        })
        .filter(Boolean)
        .join('\n\n');
    }

    if (typeof answers === 'object') {
      return Object.entries(answers)
        .map(([q, a]) => `${q}\n${String(a ?? '')}`)
        .join('\n\n');
    }

    return String(answers);
  }

  private toIsoDate(createdAt: Date): string {
    return new Date(createdAt).toISOString();
  }

  private limitText(value: string, maxLength = 1900): string {
    return value.length > maxLength ? value.slice(0, maxLength) : value;
  }
}

export const syncLatestJournalLogs = async (userId: number, limit = 20) => {
  const service = new SyncJournalLogsService();
  return service.syncLatestJournalLogs(userId, { limit });
};

export const getJournalLogs = async (userId: number, limit = 20) => {
  const normalizedLimit = Number.isFinite(limit)
    ? Math.min(Math.max(Math.trunc(limit), 1), 250)
    : 20;

  const sql = `
    SELECT
      id,
      user_id,
      content_html,
      answers,
      origin,
      created_at
    FROM journal_logs
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2;
  `;

  const { rows } = await query<JournalLogRow>(sql, [userId, normalizedLimit]);
  return rows;
};
