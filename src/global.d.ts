import type { SlackApp, SlackEdgeAppEnv } from "slack-cloudflare-workers";

declare global {
  interface Env {
    DB: D1Database;
  }
  Env = Env;
  SlackAppEnv = SlackAppEnv;
  type SlackAppEnv = SlackEdgeAppEnv & Env;
}
