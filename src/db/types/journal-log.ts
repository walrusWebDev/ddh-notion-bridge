export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

export type JsonArray = JsonValue[];

// Flexible answer item for WordPress Q&A payloads.
export interface JournalAnswerItem {
  question?: string;
  answer?: string;
  [key: string]: JsonValue | undefined;
}

export type JournalAnswers = JournalAnswerItem[] | JsonObject | JsonArray;

export interface JournalLogRow {
  id: number;
  user_id: number;
  content_html: string | null;
  answers: JournalAnswers | null;
  origin: string | null;
  created_at: Date;
}

export interface CreateJournalLogInput {
  user_id: number;
  content_html?: string | null;
  answers?: JournalAnswers | null;
  origin?: string | null;
}
