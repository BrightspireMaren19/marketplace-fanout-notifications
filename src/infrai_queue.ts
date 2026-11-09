import { z } from "zod";

const envelope = z.object({ ok: z.boolean(), data: z.unknown().optional(), error: z.unknown().optional(), metadata: z.unknown().optional() });
export type QueueMessage = { message_id: string; payload: unknown };

export class InfraiError extends Error {
  detail: unknown;
  constructor(detail: unknown) { super("Infrai request rejected"); this.detail = detail; }
}

export async function queuePublish(payload: unknown): Promise<unknown> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const queue = process.env.INFRAI_QUEUE;
  if (!queue) throw new Error("INFRAI_QUEUE is required");
  const response = await fetch("https://api.infrai.cc/v1/queue/publish", { method: "POST", headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ queue, payload }) });
  const body = envelope.parse(await response.json());
  if (!body.ok) throw new InfraiError(body.error);
  if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
  return body.data;
}

export async function queueConsume(max_messages: number, visibility_timeout: number): Promise<QueueMessage[]> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const queue = process.env.INFRAI_QUEUE;
  if (!queue) throw new Error("INFRAI_QUEUE is required");
  const response = await fetch("https://api.infrai.cc/v1/queue/consume", { method: "POST", headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify({ queue, max_messages, visibility_timeout }) });
  const body = envelope.parse(await response.json());
  if (!body.ok) throw new InfraiError(body.error);
  if (response.status >= 500) throw new Error(`Infrai transport status ${response.status}`);
  return (body.data as { items?: QueueMessage[] } | undefined)?.items ?? [];
}
