import assert from "node:assert/strict";
import { buildMessages, notificationRequest } from "./marketplace_fanout.js";

const input = notificationRequest.parse({ seller_asset: "sku-42", buyer_update: "packed", order_id: "order-9", subscribers: ["buyer-1", "buyer-2"] });
const messages = buildMessages(input);
assert.equal(messages.length, 2);
assert.deepEqual(messages[1].payload, { seller_asset: "sku-42", buyer_update: "packed", order_id: "order-9", subscriber: "buyer-2" });
console.log("fanout decision: one queue message per subscriber");
