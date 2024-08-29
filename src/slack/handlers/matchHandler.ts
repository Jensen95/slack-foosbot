import { SlackApp } from "slack-cloudflare-workers";
import { handlerService } from "../../handlerService";
import { prismaClientService } from "../../prismaClientService";
import { playerVsPlayerService } from "../../scoring/playerVsPlayer";

export const MATCH_COMMAND = "!game";
export const MATCH_REGEX = new RegExp(
  `^${MATCH_COMMAND} ([A-Z]{3}) ([A-Z]{3})`,
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

  return {
    match,
    winnerPlayer,
    looserPlayer,
    updatedScores: { winner: _winner, looser: _looser },
  };
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
    const matchResult = await createMatch(player1, player2, payload.channel);
    if (!matchResult) {
      await context.client.chat.postEphemeral({
        channel: payload.channel,
        user: payload.user!,
        text: "Match creation failed",
      });
      return;
    }

    const { winnerPlayer, looserPlayer, updatedScores } = matchResult;
    const { winner: winnerUpdatedScores, looser: looserUpdatedScores } =
      updatedScores;
    await context.client.chat.postMessage({
      channel: payload.channel,
      text: `Match finished!\nWinner: ${winnerPlayer.initials}\nLooser: ${looserPlayer.initials}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `Match finished!`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Elo Scores:*\nWinner: ${
              winnerPlayer.initials
            } - ${winnerUpdatedScores.elo.elo.toDecimalPlaces(2).toString()}
            \nLooser: ${looserPlayer.initials} - ${looserUpdatedScores.elo.elo
              .toDecimalPlaces(2)
              .toString()}
            Winner gained ${winnerUpdatedScores.elo.elo
              .sub(winnerPlayer.elo[0].elo)
              .toDecimalPlaces(2)
              .toString()} points
            Looser lost ${looserUpdatedScores.elo.elo
              .sub(looserPlayer.elo[0].elo)
              .toDecimalPlaces(2)
              .toString()} points
            `,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Glicko2 Scores:*\nWinner: ${
              winnerPlayer.initials
            } - ${winnerUpdatedScores.glicko2.rating
              .toDecimalPlaces(2)
              .toString()}\nLooser: ${
              looserPlayer.initials
            } - ${looserUpdatedScores.glicko2.rating
              .toDecimalPlaces(2)
              .toString()}
              Winner gained ${winnerUpdatedScores.glicko2.rating
                .sub(winnerPlayer.glicko2[0].rating)
                .toDecimalPlaces(2)
                .toString()} points
                Looser lost ${looserUpdatedScores.glicko2.rating
                  .sub(looserPlayer.glicko2[0].rating)
                  .toDecimalPlaces(2)
                  .toString()} points
              `,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*TrueSkill Scores:*\nWinner: ${
              winnerPlayer.initials
            } - ${winnerUpdatedScores.trueSkill.mu
              .toDecimalPlaces(2)
              .toString()}\nLooser: ${
              looserPlayer.initials
            } - ${looserUpdatedScores.trueSkill.mu
              .toDecimalPlaces(2)
              .toString()}
            Winner gained ${winnerUpdatedScores.trueSkill.mu
              .sub(winnerPlayer.trueSkill[0].mu)
              .toDecimalPlaces(2)
              .toString()} points
              Looser lost ${looserUpdatedScores.trueSkill.mu
                .sub(looserPlayer.trueSkill[0].mu)
                .toDecimalPlaces(2)
                .toString()} points
              `,
          },
        },
      ],
    });
  });
};

handlerService.addHandler(addMatchHandler);
handlerService.addMessageCommand(
  MATCH_COMMAND,
  "Create a new match, e.g. !game ABC DEF"
);
