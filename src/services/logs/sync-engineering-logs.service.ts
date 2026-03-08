import { Client } from '@notionhq/client';
import { env } from '../../config/env.js';
import { EngineeringLogRepository } from '../../db/repositories/engineering-log.repository.js';
import type { EngineeringLogRow } from '../../db/types/engineering-log.js';

const ORIGIN_OPTIONS = new Set(['cli', 'wordpress', 'telemetry', 'mcp']);
const FRICTION_OPTIONS = new Set(['None', 'Low', 'Medium', 'High', 'Blocked']);
const TITLE_PROPERTY = 'Name';

export interface SyncEngineeringLogsResult {
  processed: number;
  created: number;
  updated: number;
  failed: number;
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
    let failed = 0;

    for (const log of logs) {
      try {
        const existingPageId = await this.findPageIdByLogId(log.id);
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
          });
          created += 1;
        }
      } catch (error) {
        failed += 1;
        console.error(`Failed to sync engineering log ${log.id}:`, error);
      }
    }

    return {
      processed: logs.length,
      created,
      updated,
      failed,
    };
  }

  private async findPageIdByLogId(logId: number): Promise<string | null> {
    const title = `LOG-${logId}`;

    const response = await this.notion.databases.query({
      database_id: this.engineeringLogsDbId,
      filter: {
        property: TITLE_PROPERTY,
        title: {
          equals: title,
        },
      },
      page_size: 1,
    });

    return response.results[0]?.id ?? null;
  }

  private toNotionProperties(log: EngineeringLogRow): Record<string, unknown> {
    const createdAt =
      log.created_at instanceof Date ? log.created_at.toISOString() : new Date(log.created_at).toISOString();

    const normalizedFriction = this.normalizeFriction(log.friction);
    const origin = this.normalizeOrigin(log.origin);
    const tags = Array.isArray(log.tags) ? log.tags.filter(Boolean) : [];

    return {
      [TITLE_PROPERTY]: {
        title: [{ text: { content: `LOG-${log.id}` } }],
      },
      'User ID': {
        number: log.user_id,
      },
      'Logged At': {
        date: { start: createdAt },
      },
      Content: {
        rich_text: [{ text: { content: this.limitText(log.content) } }],
      },
      Scope: {
        multi_select: log.scope ? [{ name: this.limitText(log.scope, 100) }] : [],
      },
      Decision: {
        rich_text: log.decision ? [{ text: { content: this.limitText(log.decision) } }] : [],
      },
      Friction: {
        select: { name: normalizedFriction },
      },
      'Friction Notes': {
        rich_text: log.friction ? [{ text: { content: this.limitText(log.friction) } }] : [],
      },
      Tags: {
        multi_select: tags.map((tag) => ({ name: this.limitText(tag, 100) })),
      },
      Origin: {
        select: { name: origin },
      },
    };
  }

  private normalizeOrigin(origin: string | null): string {
    if (!origin) {
      return 'cli';
    }

    return ORIGIN_OPTIONS.has(origin) ? origin : 'mcp';
  }

  private normalizeFriction(friction: string | null): string {
    if (!friction) {
      return 'None';
    }

    if (FRICTION_OPTIONS.has(friction)) {
      return friction;
    }

    const value = friction.toLowerCase();

    if (value.includes('block')) return 'Blocked';
    if (value.includes('high')) return 'High';
    if (value.includes('medium')) return 'Medium';
    if (value.includes('low')) return 'Low';

    return 'None';
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
