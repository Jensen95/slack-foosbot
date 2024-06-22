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
  addHistoryImportHandlers,
  noopAckHandler,
} from "./handlers/index";

export default {
  async fetch(
    request: Request,
    env: SlackEdgeAppEnv,
    ctx: ExecutionContext
  ): Promise<Response> {
    const app = new SlackApp({ env })
      // when the pattern matches, the framework automatically acknowledges the request
      .event("app_mention", appMention)
      .message("Hello", helloMessage)
      .event("message", otherMessages)
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
    addHistoryImportHandlers(app);

    return await app.run(request, ctx);
  },
};
