import {
  ShortcutLazyHandler,
  SlackApp,
  ShortcutAckHandler,
  ViewSubmissionAckHandler,
  ViewSubmissionLazyHandler,
} from "slack-cloudflare-workers";
import { handlerService } from "../../handlerService";
import { prismaClientService } from "../../prismaClientService";
import {
  NEW_PLAYER_COMMAND,
  NEW_PLAYER_REGEX,
  createNewPlayer,
} from "./newPlayerHandler";
import { MATCH_COMMAND, MATCH_REGEX, createMatch } from "./matchHandler";
import { noopAckHandler } from "./commonHandlers";
import { REVERT_COMMAND, revertLastMatch } from "./revertHandler";

const importHistory: ShortcutLazyHandler = async ({ context, payload }) => {
  await context.client.views.open({
    trigger_id: payload.trigger_id,
    view: {
      type: "modal",
      callback_id: "import_history_modal",
      title: { type: "plain_text", text: "Import match history" },
      submit: { type: "plain_text", text: "Confirm" },
      close: { type: "plain_text", text: "Cancel" },
      blocks: [
        {
          type: "input",
          block_id: "channel_id",
          element: {
            type: "channels_select",
            action_id: "channel_id",
            placeholder: { type: "plain_text", text: "Enter channel ID" },
          },
          hint: { type: "plain_text", text: "Select a channel to import" },
          label: { type: "plain_text", text: "Channel ID" },
        },
      ],
    },
  });
};
const ackShortcut: ShortcutAckHandler = async (req) => {};

const ackModalSubmission: ViewSubmissionAckHandler = async (req) => {
  // post user only message
  req.context.client.chat.postEphemeral?.({
    text: "I'm working on it :hammer_and_wrench:",
    user: req.payload.user.id,
    channel:
      req.payload.view.state.values.channel_id.channel_id.selected_channel!,
  });
  return { response_action: "clear" };
};
const asyncModalResponse: ViewSubmissionLazyHandler = async (req) => {
  const modalResponse = req.payload.view.state.values;
  const channel = modalResponse.channel_id.channel_id.selected_channel!;

  const existingChannel = await prismaClientService.db.channel.findUnique({
    where: { id: channel },
  });

  if (existingChannel) {
    await prismaClientService.db.channel.delete({
      where: { id: channel },
      select: { matches: true, players: true },
    });
  }

  await prismaClientService.db.channel.create({
    data: {
      id: channel,
      teamId: req.payload.team?.id!,
    },
  });
  let cursor: string | undefined;
  let hasMore = false;
  const maxEpoch = Math.floor(Date.now() / 1000) + ".999999";

  const history: { ts: string; text: string }[] = [];
  do {
    const response = await req.context.client.conversations.history({
      channel: channel,
      cursor: cursor,
    });
    hasMore = response.has_more ?? false;
    cursor = response.response_metadata?.next_cursor;
    history.push(
      ...(response.messages?.map((m) => ({
        ts: m.ts ?? maxEpoch,
        text: m.text ?? "",
      })) ?? [])
    );
  } while (hasMore);
  const dbCommands = history.reverse().map((message) => {
    switch (true) {
      case message.text.startsWith(MATCH_COMMAND): {
        const match = message.text.match(MATCH_REGEX);
        if (!match) {
          console.log("Invalid match", message.text);
          return noopAckHandler;
        }
        const [_, winner, looser] = match;
        return () => createMatch(winner, looser, channel);
      }
      case message.text.startsWith(NEW_PLAYER_COMMAND): {
        const player = message.text.match(NEW_PLAYER_REGEX);
        if (!player) {
          console.log("Invalid player", message.text);
          return noopAckHandler;
        }

        return () => createNewPlayer(player[1], channel);
      }
      case message.text.startsWith(REVERT_COMMAND): {
        return () => revertLastMatch(channel);
      }
      default:
        // console.log("Message not recognized", message.text);
        return noopAckHandler;
    }
  });
  for (const command of dbCommands) {
    try {
      await command();
    } catch (error) {
      console.error(error);
    }
  }

  // Send the history to the user
  await req.context.client.chat.postEphemeral?.({
    text: "It's done :white_check_mark:",
    user: req.payload.user.id,
    channel: modalResponse.channel_id.channel_id.selected_channel!,
  });
};

const addHistoryImportHandlers = (app: SlackApp<any>) => {
  app.shortcut("import_history", ackShortcut, importHistory);
  app.viewSubmission(
    "import_history_modal",
    ackModalSubmission,
    asyncModalResponse
  );
};

handlerService.addHandler(addHistoryImportHandlers);
handlerService.addManifestItem([
  {
    name: "Import/start match history",
    type: "global",
    callbackId: "import_history",
    description: "Import or start a match history in a channel",
  },
]);
