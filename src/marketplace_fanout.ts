import { z } from "zod";
import { queuePublish } from "./infrai_queue.js";

export const notificationRequest = z.object({ seller_asset: z.string().min(1), buyer_update: z.string().min(1), order_id: z.string().min(1), subscribers: z.array(z.string().min(1)).min(1) });
export type NotificationRequest = z.infer<typeof notificationRequest>;

export function buildMessages(input: NotificationRequest): Array<{ subscriber: string; payload: object }> {
  return input.subscribers.map((subscriber) => ({ subscriber, payload: { seller_asset: input.seller_asset, buyer_update: input.buyer_update, order_id: input.order_id, subscriber } }));
}

export async function fanout(raw: unknown): Promise<{ queued: number; order_id: string }> {
  const input = notificationRequest.parse(raw);
  const messages = buildMessages(input);
  for (const message of messages) await queuePublish(message.payload);
  return { queued: messages.length, order_id: input.order_id };
}

if (process.argv[1]?.endsWith("marketplace_fanout.ts")) {
  const raw = process.env.NOTIFICATION_JSON;
  if (!raw) throw new Error("Set NOTIFICATION_JSON to a request body");
  fanout(JSON.parse(raw)).then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error); process.exitCode = 1; });
}
