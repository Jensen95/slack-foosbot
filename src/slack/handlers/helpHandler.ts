import { SlackApp } from "slack-cloudflare-workers";
import { handlerService } from "../../handlerService";

const HELP_COMMAND = "!help";
const HELP_REGEX = new RegExp(`^${HELP_COMMAND}`, "im");

const helpHandler = (app: SlackApp<SlackAppEnv>) => {
  app.message(HELP_REGEX, async ({ context, payload }) => {
    await context.client.chat.postMessage({
      channel: payload.channel,
      text: handlerService.getCommandHelp(),
    });
  });
};

handlerService.addHandler(helpHandler);
