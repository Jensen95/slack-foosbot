import { SlackApp } from "slack-cloudflare-workers";
import { handlerService } from "../handlerService";
import { prismaClientService } from "../prismaClientService";
import { SlackAppEnv } from "..";

export const RANK_COMMAND = "!rank";
export const RANK_REGEX = new RegExp(
  `${RANK_COMMAND}( ?all){0,1}( ?(elo|trueskill|glicko2)){0,1}`,
  "im"
);

const rankHandler = (app: SlackApp<SlackAppEnv>) => {
  app.message(RANK_REGEX, async ({ context, payload }) => {
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
    const [_, includeInactive, sortBy] = text.match(RANK_REGEX) || [];
    const sortByScore: "elo" | "trueSkill" | "glicko2" =
      (sortBy as any) || "glicko2";
    const players = await prismaClientService.db.player.findMany({
      where: {
        channelId: payload.channel,
        updatedAt: includeInactive
          ? undefined
          : {
              gte: new Date(new Date().getTime() - 1000 * 60 * 60 * 24 * 30),
            },
      },
      select: prismaClientService.playerScoreSelect(),
    });

    const sortedAndMappedPlayers = [...players]
      .sort((a, b) => {
        switch (sortByScore) {
          case "elo":
            return b.elo[0].elo.comparedTo(a.elo[0].elo);
          case "trueSkill":
            return b.trueSkill[0].mu.comparedTo(a.trueSkill[0].mu);
          case "glicko2":
          default:
            return b.glicko2[0].rating.comparedTo(a.glicko2[0].rating);
        }
      })
      .map((p) => ({
        ...p,
        elo: p.elo[0].elo.toDecimalPlaces(2).toString(),
        glicko2: p.glicko2[0].rating.toDecimalPlaces(2).toString(),
        trueSkill: p.trueSkill[0].mu.toDecimalPlaces(2).toString(),
      }));

    const tableData = [
      {
        rank: "🏆 Rank",
        initials: "Player",
        elo: "Elo",
        trueSkill: "TrueSkill",
        glicko2: "Glicko2",
      },
    ].concat(
      sortedAndMappedPlayers.map((p, i) => ({
        rank: getRank(i + 1, sortedAndMappedPlayers.length === i + 1),
        initials: p.initials,
        elo: p.elo,
        trueSkill: p.trueSkill,
        glicko2: p.glicko2,
      }))
    );

    const tableRows = tableData
      .map(addColumnPadding(getMaxColumnChars(tableData)))
      .map(
        (r) =>
          `| ${r.rank} | ${r.initials} | ${boldScore(
            r.elo,
            "elo",
            sortByScore
          )} | ${boldScore(
            r.trueSkill,
            "trueSkill",
            sortByScore
          )} | ${boldScore(r.glicko2, "glicko2", sortByScore)} |`
      );
    const tableString = [
      "".padEnd(tableRows[0].length, "_"),
      ...tableRows,
      "".padEnd(tableRows[0].length, "‾"),
    ].join("\n");
    await context.client.chat.postMessage({
      channel: payload.channel,
      text: "Ranking",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `🏆 Ranking as of ${new Date().toLocaleDateString()} 🏆`,
          },
        },
        {
          type: "divider",
        },
        {
          type: "rich_text",
          elements: [
            {
              type: "rich_text_preformatted",
              elements: [
                {
                  type: "text",
                  text: tableString,
                },
              ],
            },
          ],
        },
      ],
    });
  });
};

const getRank = (rank: number, last?: boolean) => {
  switch (rank) {
    case 1:
      return `🥇 ${rank}`;
    case 2:
      return `🥈 ${rank}`;
    case 3:
      return `🥉 ${rank}`;
    default:
      if (last) {
        return `💩 ${rank}`;
      }
      return `🏅 ${rank}`;
  }
};

const boldScore = (
  value: string,
  score: "elo" | "trueSkill" | "glicko2",
  sortedBy: "elo" | "trueSkill" | "glicko2"
) => {
  return score === sortedBy ? `*${value}*` : value;
};

const getMaxColumnChars = <T extends Record<string, string>>(players: T[]) => {
  const maxColumnChars = players.reduce((acc, p) => {
    for (const key in p) {
      if (typeof p[key] === "string") {
        acc[key] = Math.max(acc[key] || 0, p[key].length);
      }
    }

    return acc;
  }, {} as Record<keyof T, number>);
  return maxColumnChars;
};

const addColumnPadding =
  <T extends Record<string, string>>(
    maxColumnLenths: Record<keyof T, number>
  ) =>
  (player: T, playerIndex: number) => {
    const result = {} as Record<keyof T, string>;

    for (const key in player) {
      result[key] = player[key][playerIndex === 0 ? "padEnd" : "padStart"](
        maxColumnLenths[key]
      );
    }
    return result;
  };

handlerService.addHandler(rankHandler);
