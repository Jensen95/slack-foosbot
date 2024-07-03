import { SlackApp } from "slack-cloudflare-workers";
import { handlerService } from "../handlerService";
import { prismaClientService } from "../prismaClientService";
import { SlackAppEnv } from "..";

export const NEW_PLAYER_COMMAND = "!newplayer";
export const NEW_PLAYER_REGEX = new RegExp(
  `${NEW_PLAYER_COMMAND} ([A-Z]{3})`,
  "im"
);
export const START_ELO = 1000;

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
  await prismaClientService.db.player.create({
    data: {
      initials: player,
      elo: START_ELO,
      channelId: channelId,
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
  });
};

handlerService.addHandler(addNewPlayerHandler);
