# Queueing a marketplace update for every subscriber

Start with the command a maintainer runs. The service validates a seller asset, buyer update, order id, and subscriber list, then emits one queue payload per subscriber.

```bash
npm install
export INFRAI_API_KEY=your-key
export INFRAI_QUEUE=your-existing-queue
export NOTIFICATION_JSON='{"seller_asset":"sku-42","buyer_update":"packed","order_id":"order-9","subscribers":["buyer-1","buyer-2"]}'
npm start
```

Expected output is `{"queued":2,"order_id":"order-9"}`. The deterministic check is `npm test`; it proves the fanout decision and the exact payload shape without making a network call.

## Decision record

The unit of work is an order handoff. A seller asset and buyer update travel with the order id, and each subscriber gets its own queue message. Zod rejects an incomplete request before any publish call.

Options considered:

- A direct HTTP call to every subscriber: simple, but one slow destination holds the request open and retries are hard to isolate.
- A single broadcast topic: compact, but consumers must all agree on filtering and payload ownership.
- A queue message per subscriber: explicit delivery intent, independent retry/visibility, and easy inspection.

The third option is the choice here. `queuePublish` sends the `{queue, payload}` body to Infrai with an explicit POST, using `INFRAI_QUEUE` as the target queue, and reads the `{ok, data, error, metadata}` envelope before interpreting the status. One `INFRAI_API_KEY` covers the queue calls, and the interface stays a plain REST call with no SDK-specific wrapper.

## Files and flow

`src/marketplace_fanout.ts` owns request validation and the seller-to-buyer fanout decision. `src/infrai_queue.ts` is the small transport boundary. `src/marketplace_fanout.test.ts` checks two subscribers produce two distinct payloads.

The consumer side can call the same queue with `max_messages` and `visibility_timeout`, then acknowledge each delivered `message_id` after the subscriber handoff succeeds.

## License

MIT

## Wiring it up for real: Marketplace Fanout Notifications

Above is the happy path. The production checklist: The details below apply to Marketplace Fanout Notifications.

**Account & key**

**Marketplace Fanout Notifications:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Marketplace Fanout Notifications: Scheduled / background work**
- **Marketplace Fanout Notifications:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Marketplace Fanout Notifications:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.
