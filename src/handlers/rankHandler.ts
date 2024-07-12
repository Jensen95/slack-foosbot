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
      (sortBy as any) ?? "glicko2";
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

    const sortedPlayers = players
      .map((p) => ({
        ...p,
        elo: p.elo[0],
        glicko2: p.glicko2[0],
        trueSkill: p.trueSkill[0],
      }))
      .sort((a, b) => {
        switch (sortByScore) {
          case "elo":
            return b.elo.elo.comparedTo(a.elo.elo);
          case "trueSkill":
            return b.trueSkill.mu.comparedTo(a.trueSkill.mu);
          case "glicko2":
          default:
            return b.glicko2.rating.comparedTo(a.glicko2.rating);
        }
      });

    await context.client.chat.postMessage({
      channel: payload.channel,
      mrkdwn: true,

      text: `
                  #Ranking sorted by ${sortByScore}

| Rank | Player | Elo${sortByScore === "elo" ? " *" : ""} | TrueSkill${
        sortByScore === "trueSkill" ? " *" : ""
      } | Glicko2${sortByScore === "glicko2" ? " *" : ""} |
                  ${sortedPlayers
                    .map(
                      (p, i) =>
                        `| ${i + 1} | ${p.initials} | ${p.elo.elo} | ${
                          p.trueSkill.mu
                        } | ${p.glicko2.rating} |`
                    )
                    .join("\n")}
                  `,
    });
  });
};

handlerService.addHandler(rankHandler);
