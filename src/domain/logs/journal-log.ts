export interface JournalLog {
  id: number;
  user_id: number;
  content_html: string | null;
  sentiment?: string | null;
  created_at: Date;
}

export interface CreateJournalLogInput {
  user_id: number;
  content_html?: string | null;
  sentiment?: string | null;
}

// No default export for a type under ESM/TypeScript verbatimModuleSyntax
