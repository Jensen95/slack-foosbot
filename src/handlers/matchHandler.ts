import { SlackApp } from "slack-cloudflare-workers";
import { handlerService } from "../handlerService";
import { prismaClientService } from "../prismaClientService";
import { SlackAppEnv } from "..";
import { playerVsPlayerService } from "../scoring/playerVsPlayer";
import { Player } from "@prisma/client";

export const MATCH_COMMAND = "!game";
export const MATCH_REGEX = new RegExp(
  `${MATCH_COMMAND} ([A-Z]{3}) ([A-Z]{3})`,
  "im"
);

const updatePlayerScore = async (player: any, updatedPlayerScores: any) => {
  const scores = () => {
    let r = {};
    for (const key in updatedPlayerScores) {
      r = {
        ...r,
        [key]: {
          update: {
            ...updatedPlayerScores[key as keyof typeof updatedPlayerScores],
          },
        },
      };
    }
    return r;
  };
  await prismaClientService.db.player.update({
    where: { id: player.id },
    data: {
      ...scores(),
    },
  });
};
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
    include: { elo: true, glicko2: true, trueSkill: true },
  });
  if (players.length !== 2) {
    return;
  }
  const winnerPlayer = players.find((p) => p.initials === winner)!;
  const looserPlayer = players.find((p) => p.initials === looser)!;
  await prismaClientService.db.match.create({
    data: {
      looserId: looserPlayer.id,
      winnerId: winnerPlayer.id,
      channelId: channelId,
    },
  });
  const { looser: _looser, winner: _winner } = playerVsPlayerService.match(
    winnerPlayer as any,
    looserPlayer as any
  );
  await updatePlayerScore(winnerPlayer, _winner);
  await updatePlayerScore(looserPlayer, _looser);
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
