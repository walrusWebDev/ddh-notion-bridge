import { Client } from '@notionhq/client';
import '../../config/env.js';

// Support either NOTION_KEY (requested) or existing NOTION_TOKEN env var.
const token = process.env.NOTION_KEY ?? process.env.NOTION_TOKEN;

if (!token) {
  throw new Error('Missing NOTION_KEY or NOTION_TOKEN environment variable for Notion client.');
}

export const notionClient = new Client({ auth: token });

export default notionClient;
