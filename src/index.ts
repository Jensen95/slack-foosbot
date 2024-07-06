import { SlackApp, SlackEdgeAppEnv } from "slack-cloudflare-workers";
import {
  ackCommand,
  ackModalSubmission,
  appMention,
  asyncButtonResponse,
  asyncCommandResponse,
  asyncMessageShortcut,
  asyncModalResponse,
  asyncShortcutResponse,
  helloMessage,
  otherMessages,
  noopAckHandler,
} from "./handlers/index";
import { handlerService } from "./handlerService";
import { prismaClientService } from "./prismaClientService";

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
      const app = new SlackApp<SlackAppEnv>({ env })
        // when the pattern matches, the framework automatically acknowledges the request
        .event("app_mention", appMention)
        .message("Hello", helloMessage)
        .action(
          "button-action",
          noopAckHandler, // complete this within 3 seconds
          asyncButtonResponse
        )
        .command(
          "/hello-cf-workers",
          ackCommand, // complete this within 3 seconds
          asyncCommandResponse
        )
        .shortcut(
          "hey-cf-workers",
          noopAckHandler, // complete this within 3 seconds
          asyncShortcutResponse
        )
        .messageShortcut(
          "cf-workers-message",
          noopAckHandler, // complete this within 3 seconds
          asyncMessageShortcut
        )
        .viewSubmission(
          "modal",
          // respond within 3 seconds to update/close the opening modal
          ackModalSubmission,
          asyncModalResponse
        );
      return await handlerService
        .applyHandlersToApp(app)
        // Message event is a catch all an should be at the end
        .event("message", otherMessages)
        .run(request, ctx);
    }

    return new Response(
      JSON.stringify(
        {
          players: await prismaClientService.db.player.findMany({
            include: { elo: true, glicko2: true, trueSkill: true },
          }),
          matches: await prismaClientService.db.match.findMany(),
          elo: await prismaClientService.db.elo.findMany(),
        },
        null,
        2
      ),
      { status: 200 }
    );
  },
};
