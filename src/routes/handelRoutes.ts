import { fromIttyRouter } from "chanfana";
import { IttyRouter, error } from "itty-router";
import { GetChannelStat } from "./scoreOverview";
import { GetPlayerStats } from "./playerScores";

export const handelRoutes = (
  request: Request,
  env: Env,
  ctx: ExecutionContext
) => {
  const router = IttyRouter();
  const openapi = fromIttyRouter(router);
  openapi.get("/players/:playerId/stats", GetPlayerStats);
  openapi.get("/:teamId/:channelId/stats", GetChannelStat);
  // openapi.get("*", async () =>
  //   json({
  //     channels: await prismaClientService.db.channel.findMany(),
  //   })
  // );

  openapi.all("*", () => error(404));
  return openapi.fetch(request, env, ctx).catch(error);
};
