import { OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { prismaClientService } from "../prismaClientService";
import { Env } from "..";

export class GetPlayerStats extends OpenAPIRoute {
  schema = {
    request: {
      params: z.object({
        playerId: z.string().cuid(),
      }),
      query: z.object({}),
    },
    response: {
      200: {
        description: "Player stats",
        content: {
          "application/json": {
            schema: z.object({
              id: z.string(),
              initials: z.string(),
              name: z.string().nullable(),
              totalPlayedMatches: z.number(),
              wonMatches: z.number(),
              lostMatches: z.number(),
              elo: z.array(
                z.object({
                  elo: z.number(),
                  timestamp: z.string(),
                })
              ),
              glicko2: z.array(
                z.object({
                  rating: z.number(),
                  rd: z.number(),
                  vol: z.number(),
                  timestamp: z.string(),
                })
              ),
              trueSkill: z.array(
                z.object({
                  mu: z.number(),
                  sigma: z.number(),
                  tau: z.number(),
                  timestamp: z.string(),
                })
              ),
            }),
          },
          "text/html": {
            schema: z.string({ description: "HTML table of player scores" }),
          },
        },
      },
      404: z.object({ error: z.string() }),
    },
  };

  async handle(request: Request, env: Env, context: ExecutionContext) {
    const data = await this.getValidatedData<typeof this.schema>();
    const player = await prismaClientService.getPlayerWithScores(
      data.params.playerId
    );

    switch (request.headers.get("Accept")) {
      case "application/json":
        return new Response(JSON.stringify(player), {
          headers: {
            "Content-Type": "application/json",
          },
        });

      default:
        return new Response(
          `
            <html>
            <head>
                <script src="https://d3js.org/d3.v7.min.js"></script>
                <title> ${player.name ?? player.initials} stats in channel ${
            player.channelId
          }</title>
            </head>
            <body>
            <h1> ${player.name ?? player.initials} stats in channel ${
            player.channelId
          }</h1>

                        <table>
                <thead>
                <tr>
                    <th>Initials</th>
                    <th>Total Played Matches</th>
                    <th>Won</th>
                    <th>Elo</th>
                    <th>Glicko2</th>
                    <th>TrueSkill</th>
                </tr>
                </thead>
                <tbody>
                <tr>
                    <td>${player.initials}</td>
                    <td>${player.totalPlayedMatches}</td>
                    <td>${player.wonMatches}</td>
                    <td>${player.elo[0].elo}</td>
                    <td>${player.glicko2[0].rating}</td>
                    <td>${player.trueSkill[0].mu}</td>
                </tr>
                </tbody>
            </table>
            <script>
                const data = ${JSON.stringify(player)};
                console.log(data);
                </script>
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
}
