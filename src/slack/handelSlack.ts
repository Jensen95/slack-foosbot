import { isPostedMessageEvent, SlackApp } from "slack-cloudflare-workers";
import { appMention } from "./handlers";
import { handlerService } from "../handlerService";

export const handelSlack = async (
  request: Request,
  env: SlackAppEnv,
  ctx: ExecutionContext
) => {
  const app = new SlackApp<SlackAppEnv>({ env })
    // when the pattern matches, the framework automatically acknowledges the request
    .event("app_mention", appMention);
  // .message("Hello", helloMessage)
  // .action(
  //   "button-action",
  //   noopAckHandler, // complete this within 3 seconds
  //   asyncButtonResponse
  // )
  // .command(
  //   "/hello-cf-workers",
  //   ackCommand, // complete this within 3 seconds
  //   asyncCommandResponse
  // )
  // .shortcut(
  //   "hey-cf-workers",
  //   noopAckHandler, // complete this within 3 seconds
  //   asyncShortcutResponse
  // )
  // .messageShortcut(
  //   "cf-workers-message",
  //   noopAckHandler, // complete this within 3 seconds
  //   asyncMessageShortcut
  // )
  // .viewSubmission(
  //   "modal",
  //   // respond within 3 seconds to update/close the opening modal
  //   ackModalSubmission,
  //   asyncModalResponse
  // );
  return await handlerService
    .applyHandlersToApp(app)
    // Message event is a catch all an should be at the end
    .event("message", async ({ payload, context }) => {
      if (isPostedMessageEvent(payload)) {
        context.say({ text: handlerService.getCommandHelp(payload.text) });
      }
    })
    .run(request, ctx);
};
