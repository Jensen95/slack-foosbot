import { SlackEdgeAppEnv } from "slack-cloudflare-workers";
import { prismaClientService } from "./prismaClientService";
import { handelRoutes } from "./routes";
import { handelSlack } from "./slack";

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
      console.log("Handling slack request");
      return handelSlack(request, env, ctx);
    }

    return handelRoutes(request, env, ctx);
  },
};
