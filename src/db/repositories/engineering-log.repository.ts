import { query } from '../client.js';
import type { EngineeringLogRow } from '../types/engineering-log.js';

export class EngineeringLogRepository {
  async findRecentByUser(userId: number, limit: number): Promise<EngineeringLogRow[]> {
    const normalizedLimit = Number.isFinite(limit)
      ? Math.min(Math.max(Math.trunc(limit), 1), 250)
      : 25;

    const sql = `
      SELECT
        id,
        user_id,
        content,
        scope,
        decision,
        rationale,
        friction,
        tags,
        origin,
        created_at
      FROM engineering_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2;
    `;

    const { rows } = await query<EngineeringLogRow>(sql, [userId, normalizedLimit]);
    return rows;
  }

  async findByDateRange(
    userId: number,
    startDate: Date,
    endDate: Date
  ): Promise<EngineeringLogRow[]> {
    const sql = `
      SELECT
        id,
        user_id,
        content,
        scope,
        decision,
        rationale,
        friction,
        tags,
        origin,
        created_at
      FROM engineering_logs
      WHERE user_id = $1
        AND created_at >= $2
        AND created_at <= $3
      ORDER BY created_at DESC;
    `;

    const { rows } = await query<EngineeringLogRow>(sql, [
      userId,
      startDate,
      endDate,
    ]);

    return rows;
  }

  async getRecentFriction(
    userId: number,
    limit: number
  ): Promise<EngineeringLogRow[]> {
    const normalizedLimit = Number.isFinite(limit)
      ? Math.min(Math.max(Math.trunc(limit), 1), 100)
      : 10;

    const sql = `
      SELECT
        id,
        user_id,
        content,
        scope,
        decision,
        rationale,
        friction,
        tags,
        origin,
        created_at
      FROM engineering_logs
      WHERE user_id = $1
        AND friction IS NOT NULL
        AND BTRIM(friction) <> ''
      ORDER BY created_at DESC
      LIMIT $2;
    `;

    const { rows } = await query<EngineeringLogRow>(sql, [
      userId,
      normalizedLimit,
    ]);

    return rows;
  }
}
