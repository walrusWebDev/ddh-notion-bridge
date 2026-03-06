export interface EngineeringLogRow {
  id: number;
  user_id: number;
  content: string;
  scope: string | null;
  decision: string | null;
  rationale: string | null;
  friction: string | null;
  tags: string[] | null;
  origin: string | null;
  created_at: Date;
}

export interface CreateEngineeringLogInput {
  user_id: number;
  content: string;
  scope?: string | null;
  decision?: string | null;
  rationale?: string | null;
  friction?: string | null;
  tags?: string[] | null;
  origin?: string | null;
}
