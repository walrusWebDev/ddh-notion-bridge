import { Client } from '@notionhq/client';
import { env } from '../../config/env.js';
import { EngineeringLogRepository } from '../../db/repositories/engineering-log.repository.js';
import type { EngineeringLogRow } from '../../db/types/engineering-log.js';

// Canonical Notion contract (Engineering Logs DB):
// Name (title), PostgresID (number), Project (select), Date (date),
// Friction (rich_text), Decision (rich_text), Rationale (rich_text),
// Scope (select), Tags (multi_select).
// Keep these keys in sync with the Notion database schema to avoid runtime validation errors.
const TITLE_PROPERTY = 'Name';

export interface SyncEngineeringLogsResult {
  status: 'success';
  created: number;
  updated: number;
  total: number;
}

export class SyncEngineeringLogsService {
  private notion: Client;
  private repository: EngineeringLogRepository;
  private engineeringLogsDbId: string;

  constructor(repository = new EngineeringLogRepository()) {
    if (!env.notionToken) {
      throw new Error('Missing NOTION_TOKEN. Cannot sync engineering logs to Notion.');
    }

    if (!env.engineeringLogsDbId) {
      throw new Error('Missing ENGINEERING_LOGS_DB_ID. Cannot sync engineering logs to Notion.');
    }

    this.repository = repository;
    this.engineeringLogsDbId = env.engineeringLogsDbId;
    this.notion = new Client({ auth: env.notionToken });
  }

  async syncLatestEngineeringLogs(
    userId: number,
    options?: { limit?: number }
  ): Promise<SyncEngineeringLogsResult> {
    const limit = Number.isFinite(options?.limit)
      ? Math.min(Math.max(Math.trunc(options?.limit ?? 5), 1), 250)
      : 5;

    const logs = await this.repository.findRecentByUser(userId, limit);

    let created = 0;
    let updated = 0;
    for (const log of logs) {
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
          parent: { database_id: this.engineeringLogsDbId },
          properties: properties as any,
          children: [
            {
              object: 'block',
              type: 'paragraph',
              paragraph: { rich_text: [{ text: { content: this.limitText(log.content) } }] },
            },
          ],
        });
        created += 1;
      }
    }

    return {
      status: 'success',
      created,
      updated,
      total: logs.length,
    };
  }

  private async findPageIdByPostgresId(logId: number): Promise<string | null> {
    const response = await this.notion.databases.query({
      database_id: this.engineeringLogsDbId,
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

  private toNotionProperties(log: EngineeringLogRow): Record<string, unknown> {
    const createdAt =
      log.created_at instanceof Date ? log.created_at.toISOString() : new Date(log.created_at).toISOString();
    const tags = Array.isArray(log.tags) ? log.tags.filter(Boolean) : [];

    return {
      [TITLE_PROPERTY]: {
        title: [{ text: { content: `LOG-${log.id}` } }],
      },
      Project: {
        select: { name: this.limitText(log.project || 'General', 100) },
      },
      PostgresID: {
        number: log.id,
      },
      Date: {
        date: { start: createdAt },
      },
      Friction: {
        rich_text: [{ text: { content: this.limitText(log.friction || '') } }],
      },
      Decision: {
        rich_text: [{ text: { content: this.limitText(log.decision || '') } }],
      },
      Rationale: {
        rich_text: [{ text: { content: this.limitText(log.rationale || '') } }],
      },
      Scope: {
        select: { name: this.limitText(log.scope || 'cli', 100) },
      },
      Tags: {
        multi_select: tags.map((tag) => ({ name: this.limitText(tag, 100) })),
      },
    };
  }

  private limitText(value: string, maxLength = 1900): string {
    return value.length > maxLength ? value.slice(0, maxLength) : value;
  }
}

export const syncLatestEngineeringLogs = async (userId: number, limit = 5) => {
  const service = new SyncEngineeringLogsService();
  return service.syncLatestEngineeringLogs(userId, { limit });
};

export const getEngineeringLogs = async (userId: number, limit = 5) => {
  const repository = new EngineeringLogRepository();
  return repository.findRecentByUser(userId, limit);
};
