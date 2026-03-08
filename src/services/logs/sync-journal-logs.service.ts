import { Client } from '@notionhq/client';
import { env } from '../../config/env.js';
import { query } from '../../db/client.js';
import type { JournalLogRow } from '../../db/types/journal-log.js';

const ORIGIN_OPTIONS = new Set(['wordpress', 'mcp']);

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
      ? Math.min(Math.max(Math.trunc(options?.limit ?? 5), 1), 250)
      : 5;

    const logs = await this.findRecentByUser(userId, limit);

    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const log of logs) {
      try {
        const title = this.buildTitle(log.created_at);
        const existingPageId = await this.findPageIdByTitle(title);
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
          });
          created += 1;
        }
      } catch (error) {
        failed += 1;
        console.error(`Failed to sync journal log ${log.id}:`, error);
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

  private async findPageIdByTitle(title: string): Promise<string | null> {
    const response = await this.notion.databases.query({
      database_id: this.journalSummariesDbId,
      filter: {
        property: 'Title',
        title: {
          equals: title,
        },
      },
      page_size: 1,
    });

    return response.results[0]?.id ?? null;
  }

  private toNotionProperties(log: JournalLogRow): Record<string, unknown> {
    const createdAt = this.toIsoDate(log.created_at);
    const title = this.buildTitle(log.created_at);
    const summaryMarkdown = log.content_html ?? '';
    const answersJson = JSON.stringify(log.answers ?? null);

    return {
      Title: {
        title: [{ text: { content: title } }],
      },
      'User ID': {
        number: log.user_id,
      },
      'Period Start': {
        date: { start: createdAt },
      },
      'Summary HTML': {
        rich_text: summaryMarkdown ? [{ text: { content: this.limitText(summaryMarkdown) } }] : [],
      },
      'Answers JSON': {
        rich_text: [{ text: { content: this.limitText(answersJson) } }],
      },
      Origin: {
        select: { name: this.normalizeOrigin(log.origin) },
      },
    };
  }

  private buildTitle(createdAt: Date): string {
    const date = new Date(createdAt);
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    return `Journal: ${yyyy}-${mm}-${dd}`;
  }

  private toIsoDate(createdAt: Date): string {
    return new Date(createdAt).toISOString();
  }

  private normalizeOrigin(origin: string | null): string {
    if (!origin) {
      return 'wordpress';
    }

    return ORIGIN_OPTIONS.has(origin) ? origin : 'mcp';
  }

  private limitText(value: string, maxLength = 1900): string {
    return value.length > maxLength ? value.slice(0, maxLength) : value;
  }
}

export const syncLatestJournalLogs = async (userId: number, limit = 5) => {
  const service = new SyncJournalLogsService();
  return service.syncLatestJournalLogs(userId, { limit });
};

export const getJournalLogs = async (userId: number, limit = 5) => {
  const normalizedLimit = Number.isFinite(limit)
    ? Math.min(Math.max(Math.trunc(limit), 1), 250)
    : 5;

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
