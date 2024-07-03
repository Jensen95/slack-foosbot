import { SlackApp } from "slack-cloudflare-workers";
import { handlerService } from "../handlerService";
import { prismaClientService } from "../prismaClientService";
import { SlackAppEnv } from "..";

export const MATCH_COMMAND = "!game";
export const MATCH_REGEX = new RegExp(
  `${MATCH_COMMAND} ([A-Z]{3}) ([A-Z]{3})`,
  "im"
);
export const createMatch = async (
  winner: string,
  looser: string,
  channelId: string
) => {
  const players = await prismaClientService.db.player.findMany({
    where: {
      channelId: { equals: channelId },
      initials: { in: [winner, looser] },
    },
  });
  if (players.length !== 2) {
    return;
  }
  await prismaClientService.db.match.create({
    data: {
      looserId: winner,
      winnerId: looser,
      channelId: channelId,
      players: {
        connect: players,
      },
    },
  });
};

const addMatchHandler = (app: SlackApp<SlackAppEnv>) => {
  app.message(MATCH_REGEX, async ({ context, payload }) => {
    const { text } = payload;
    const playerInitials = text.match(MATCH_REGEX);
    if (!playerInitials) {
      await context.client.chat.postEphemeral({
        channel: payload.channel,
        user: payload.user!,
        text: "Invalid players",
      });
      return;
    }
    const [_, player1, player2] = playerInitials;
    const players = await prismaClientService.db.player.findMany({
      where: {
        channelId: { equals: payload.channel },
        initials: { in: [player1, player2] },
      },
    });

    console.log(players);
    if (players.length !== 2) {
      await context.client.chat.postEphemeral({
        channel: payload.channel,
        user: payload.user!,
        text: "Players not found",
      });
      return;
    }
    await createMatch(player1, player2, payload.channel);
  });
};

handlerService.addHandler(addMatchHandler);
