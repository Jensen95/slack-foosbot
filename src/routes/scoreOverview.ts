import { fromIttyRouter, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { prismaClientService } from "../prismaClientService";

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
      200: {
        description: "Channel stats",
        content: {
          "application/json": {
            schema: z.array(
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
    switch (request.headers.get("Accept")) {
      case "application/json":
        return new Response(JSON.stringify(players), {
          headers: {
            "Content-Type": "application/json",
          },
        });
      default:
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
}

const generateD3Graph = (players: any) => {
  return `
  <html>
    <head>
      <title>Channel Stats</title>
      <script src="https://d3js.org/d3.v7.min.js"></script>
      <style>
        .bar {
          fill: steelblue;
        }
        .bar:hover {
          fill: orange;
        }
        .axis {
          font: 10px sans-serif;
        }
        .axis path,
        .axis line {
          fill: none;
          stroke: #000;
          shape-rendering: crispEdges;
        }
      </style>
    </head>
    <body>
      <h1>Channel Stats</h1>
      <svg width="960" height="500"></svg>
      <script>
        const data = ${JSON.stringify(players)};
        const margin = { top: 20, right: 20, bottom: 30, left: 40 };
        const width = 960 - margin.left - margin.right;
        const height = 500 - margin.top - margin.bottom;
        const x = d3.scaleBand().range([0, width]).padding(0.1);
        const y = d3.scaleLinear().range([height, 0]);
        const svg = d3
          .select("svg")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        x.domain(data.map((d) => d.initials));
        y.domain([0, d3.max(data, (d) => d.totalPlayedMatches)]);
        svg
          .append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(d3.axisBottom(x));
        svg.append("g").attr("class", "y axis").call(d3.axisLeft(y));
        svg
          .selectAll(".bar")
          .data(data)
          .enter()
          .append("rect")
          .attr("class", "bar")
          .attr("x", (d) => x(d.initials))
          .attr("width", x.bandwidth())
          .attr("y", (d) => y(d.totalPlayedMatches))
          .attr("height", (d) => height - y(d.totalPlayedMatches));
      </script>
    </body>
  </html>
  
          `;
};
