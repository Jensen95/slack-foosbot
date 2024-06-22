import {
  ShortcutLazyHandler,
  SlackApp,
  ShortcutAckHandler,
  ViewSubmissionAckHandler,
  ViewSubmissionLazyHandler,
} from "slack-cloudflare-workers";

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
  let cursor: string | undefined;
  let hasMore = false;
  const history: string[] = [];
  do {
    const response = await req.context.client.conversations.history({
      channel: modalResponse.channel_id.channel_id.selected_channel!,
      cursor: cursor,
    });
    hasMore = response.has_more ?? false;
    cursor = response.response_metadata?.next_cursor;
    history.push(...(response.messages?.map((m) => m.text ?? "") ?? []));
  } while (hasMore);
  console.log(
    "🚀 ~ constasyncModalResponse:ViewSubmissionLazyHandler= ~ history:",
    history
  );
  // Send the history to the user
  await req.context.client.chat.postEphemeral?.({
    text: "It's done :white_check_mark:",
    user: req.payload.user.id,
    channel: modalResponse.channel_id.channel_id.selected_channel!,
  });
};

export const addHistoryImportHandlers = (app: SlackApp<any>) => {
  app.shortcut("import_history", ackShortcut, importHistory);
  app.viewSubmission(
    "import_history_modal",
    ackModalSubmission,
    asyncModalResponse
  );
};
