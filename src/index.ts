import { prismaClientService } from "./prismaClientService";
import { handelRoutes } from "./routes";
import { handelSlack } from "./slack";

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
} satisfies ExportedHandler<SlackAppEnv>;
