import { SlackEdgeAppEnv } from "slack-cloudflare-workers";
import { prismaClientService } from "./prismaClientService";
import { handleRoutes } from "./routes";
import { handleSlack } from "./slack";

export interface Env {
  DB: D1Database;
}

export type SlackAppEnv = SlackEdgeAppEnv & Env;
export default {
  async fetch(
    request: Request,
    env: SlackAppEnv,
    ctx: ExecutionContext
  ): Promise<Response> {
    prismaClientService.initialize(env.DB);
    if (request.headers.get("x-slack-signature")) {
      return handleSlack(request, env, ctx);
    }

    return handleRoutes(request, env, ctx);
  },
};
