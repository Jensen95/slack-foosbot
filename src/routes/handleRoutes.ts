import { fromIttyRouter } from "chanfana";
import { IttyRouter, json, error } from "itty-router";
import { prismaClientService } from "../prismaClientService";
import { GetChannelStat } from "./scoreOverview";
import type { Env } from "..";
import { GetPlayerStats } from "./playerScores";

export const handleRoutes = (
  request: Request,
  env: Env,
  ctx: ExecutionContext
) => {
  const router = IttyRouter();
  const openapi = fromIttyRouter(router);
  openapi.get("/players/:playerId/stats", GetPlayerStats);
  openapi.get("/:teamId/:channelId/stats", GetChannelStat);
  openapi.get("*", async () =>
    json({
      channels: await prismaClientService.db.channel.findMany(),
    })
  );

  openapi.all("*", () => error(404));
  return openapi.fetch(request, env, ctx).catch(error);
};
