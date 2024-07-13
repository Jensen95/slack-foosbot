import { SlackApp } from "slack-cloudflare-workers";
import { handlerService } from "../handlerService";
import { prismaClientService } from "../prismaClientService";
import { SlackAppEnv } from "..";
import { playerVsPlayerService } from "../scoring/playerVsPlayer";

export const NEW_PLAYER_COMMAND = "!newplayer";
export const NEW_PLAYER_REGEX = new RegExp(
  `${NEW_PLAYER_COMMAND} ([A-Z]{3})`,
  "im"
);

export const createNewPlayer = async (player: string, channelId: string) => {
  const existingPlayer = await prismaClientService.db.player.findFirst({
    where: {
      channelId: channelId,
      initials: player,
    },
  });
  if (existingPlayer) {
    console.log("Player already exists", existingPlayer);
    return;
  }
  const newPlayer = playerVsPlayerService.newPlayer();
  const scores = () => {
    let r = {};
    for (const key in newPlayer) {
      const value = newPlayer[key as keyof typeof newPlayer];
      r = {
        ...r,
        [key]: {
          create: value,
        },
      };
    }
    return r;
  };
  await prismaClientService.db.player.create({
    data: {
      initials: player,
      channelId: channelId,
      ...scores(),
    },
  });
};

const addNewPlayerHandler = (app: SlackApp<SlackAppEnv>) => {
  app.message(NEW_PLAYER_REGEX, async ({ context, payload }) => {
    const { text } = payload;
    const channel = await prismaClientService.db.channel.findUnique({
      where: { id: payload.channel },
    });
    if (!channel) {
      await context.client.chat.postEphemeral({
        channel: payload.channel,
        user: payload.user!,
        text: "Channel not found, please import the channel first",
      });
      return;
    }

    const playerInitials = text.match(NEW_PLAYER_REGEX);
    if (!playerInitials) {
      await context.client.chat.postEphemeral({
        channel: payload.channel,
        user: payload.user!,
        text: "Invalid player",
      });
      return;
    }
    const [_, player] = playerInitials;

    await createNewPlayer(player, payload.channel);
    // TODO: Add response to user
  });
};

handlerService.addHandler(addNewPlayerHandler);
handlerService.addMessageCommand(NEW_PLAYER_COMMAND, "Create a new player");
