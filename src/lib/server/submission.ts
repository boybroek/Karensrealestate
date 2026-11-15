import type { FormId } from '../forms/schema.ts';
import type { Value } from '../forms/validate.ts';

/** A validated form submission, as handed to the delivery pipeline (Node or Cloudflare). */
export interface Submission {
  id: string;
  form: FormId;
  receivedAt: string;
  values: Record<string, Value>;
  suspicious: boolean;
}

export type SinkName = 'email' | 'webhook';
export interface OutboxRecord { submission: Submission; pending: SinkName[]; attempts: number }

export function newSubmission(form: FormId, values: Record<string, Value>, suspicious: boolean): Submission {
  return { id: crypto.randomUUID().slice(0, 8), form, receivedAt: new Date().toISOString(), values, suspicious };
}
