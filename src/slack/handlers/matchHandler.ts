import { SlackApp } from "slack-cloudflare-workers";
import { handlerService } from "../../handlerService";
import { prismaClientService } from "../../prismaClientService";
import { SlackAppEnv } from "../..";
import { playerVsPlayerService } from "../../scoring/playerVsPlayer";

export const MATCH_COMMAND = "!game";
export const MATCH_REGEX = new RegExp(
  `${MATCH_COMMAND} ([A-Z]{3}) ([A-Z]{3})`,
  "im"
);

const updatePlayerScore = async (
  playerId: string,
  matchId: string,
  updatedPlayerScores: any
) => {
  for (const key in updatedPlayerScores) {
    await prismaClientService.db[key as "elo"].create({
      data: {
        ...updatedPlayerScores[key as keyof typeof updatedPlayerScores],
        playerId,
        matchId,
      },
    });
  }
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
    select: {
      elo: {
        orderBy: { timestamp: "desc" },
        take: 1,
      },
      glicko2: { orderBy: { timestamp: "desc" }, take: 1 },
      trueSkill: { orderBy: { timestamp: "desc" }, take: 1 },
      id: true,
      initials: true,
    },
  });
  if (players.length !== 2) {
    return;
  }
  const winnerPlayer = players.find((p) => p.initials === winner)!;
  const looserPlayer = players.find((p) => p.initials === looser)!;
  const match = await prismaClientService.db.match.create({
    data: {
      looserId: looserPlayer.id,
      winnerId: winnerPlayer.id,
      channelId: channelId,
    },
  });
  const { looser: _looser, winner: _winner } = playerVsPlayerService.match(
    {
      elo: winnerPlayer.elo[0],
      glicko2: winnerPlayer.glicko2[0],
      trueSkill: winnerPlayer.trueSkill[0],
    },
    {
      elo: looserPlayer.elo[0],
      glicko2: looserPlayer.glicko2[0],
      trueSkill: looserPlayer.trueSkill[0],
    }
  );
  await updatePlayerScore(winnerPlayer.id, match.id, _winner);
  await updatePlayerScore(looserPlayer.id, match.id, _looser);
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
      select: { _count: true },
    });

    if (players.length !== 2) {
      await context.client.chat.postEphemeral({
        channel: payload.channel,
        user: payload.user!,
        text: "Players not found",
      });
      return;
    }
    await createMatch(player1, player2, payload.channel);
    // TODO: Add a response to the user
  });
};

handlerService.addHandler(addMatchHandler);
handlerService.addMessageCommand(
  MATCH_COMMAND,
  "Create a new match, e.g. !game ABC DEF"
);
