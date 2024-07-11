import { fromIttyRouter, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { prismaClientService } from "../prismaClientService";
import { Env } from "..";

export class GetChannelStat extends OpenAPIRoute {
  schema = {
    request: {
      params: z.object({
        channelId: z.string().min(1).max(256),
        teamId: z.string().min(1).max(256),
      }),
      query: z.object({
        scoringModel: z
          .enum(["elo", "glicko2", "trueSkill"], {
            description: "Whichs scoring model to use",
          })
          .default("glicko2"),
      }),
    },
    response: {
      200: z.array(
        z.object({
          playerId: z.string().min(1).max(256),
          initials: z.string().min(1).max(256),
          totalPlayedMatches: z.number(),
          elo: z.object({
            elo: z.number(),
            timestamp: z.string(),
          }),
          glicko2: z.object({
            rating: z.number(),
            rd: z.number(),
            vol: z.number(),
            timestamp: z.string(),
          }),
          trueSkill: z.object({
            mu: z.number(),
            sigma: z.number(),
            tau: z.number(),
            timestamp: z.string(),
          }),
        }),
        { description: "List of player scores in the channel" }
      ),
      404: z.object({ error: z.string() }),
    },
  };

  async handle(request: Request, env: Env, context: ExecutionContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const channel = await prismaClientService.db.channel.findUnique({
      where: { id: data.params.channelId, teamId: data.params.teamId },
      select: {
        players: {
          select: {
            id: true,
            initials: true,
            lostMatches: { select: { _count: true } },
            wonMatches: { select: { _count: true } },
            elo: {
              select: { elo: true },
              orderBy: {
                timestamp: "desc",
              },
              take: 1,
            },
            glicko2: {
              select: { rating: true, rd: true, vol: true },
              orderBy: {
                timestamp: "desc",
              },
              take: 1,
            },
            trueSkill: {
              select: { mu: true, sigma: true, tau: true },
              orderBy: {
                timestamp: "desc",
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!channel) {
      return Response.json({ error: "Channel not found" }, { status: 404 });
    }

    const players = channel.players
      .map((p) => {
        return {
          playerId: p.id,
          initials: p.initials,
          elo: p.elo[0],
          glicko2: p.glicko2[0],
          trueSkill: p.trueSkill[0],
          totalPlayedMatches: p.lostMatches.length + p.wonMatches.length,
          won: p.wonMatches.length,
        };
      })
      .sort((a, b) => {
        switch (data.query.scoringModel) {
          case "elo":
            return b.elo.elo.comparedTo(a.elo.elo);

          case "trueSkill":
            return b.trueSkill.mu.comparedTo(a.trueSkill.mu);
          case "glicko2":
          default:
            return b.glicko2.rating.comparedTo(a.glicko2.rating);
        }
      });

    const renderPlayer = (player: any) => {
      return `
        <tr>
          <td>${player.initials}</td>
          <td>${player.totalPlayedMatches}</td>
          <td>${player.won}</td>
          <td>${player.elo.elo}</td>
          <td>${player.glicko2.rating}</td>
          <td>${player.trueSkill.mu}</td>
        </tr>
      `;
    };

    return new Response(
      `
      <html>
        <head>
          <title>Channel Stats</title>
          </head>
          <body>
            <h1>Channel Stats</h1>
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Total Played Matches</th>
                  <th>Won</th>
                  <th>Elo${data.query.scoringModel === "elo" ? "*" : ""}</th>
                  <th>Glicko2${
                    data.query.scoringModel === "glicko2" ? "*" : ""
                  }</th>
                  <th>TrueSkill${
                    data.query.scoringModel === "trueSkill" ? "*" : ""
                  }</th>
                </tr>
              </thead>
              <tbody>
                ${players.map(renderPlayer).join("")}
              </tbody>
            </table>
          </body>
        </html>
`,
      {
        headers: {
          "Content-Type": "text/html",
        },
      }
    );
  }
}
