import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";

class PrismaClientService {
  #prisma?: PrismaClient;

  initialize(db: D1Database) {
    const adapter = new PrismaD1(db);
    this.#prisma = new PrismaClient({ adapter });
  }

  public get db() {
    return this.#prisma!;
  }

  public readonly playerScoreSelect = (scoreTake = 1) => {
    return {
      initials: true,
      name: true,
      id: true,
      channelId: true,
      updatedAt: true,
      elo: {
        select: { elo: true, timestamp: true },
        orderBy: { timestamp: "desc" },
        take: scoreTake,
      },
      glicko2: {
        select: { rating: true, rd: true, vol: true, timestamp: true },
        orderBy: { timestamp: "desc" },
        take: scoreTake,
      },
      trueSkill: {
        select: {
          mu: true,
          sigma: true,
          tau: true,
          pi: true,
          timestamp: true,
        },
        orderBy: { timestamp: "desc" },
        take: scoreTake,
      },
      wonMatches: { select: { _count: true } },
      lostMatches: { select: { _count: true } },
    } as const;
  };

  public readonly getPlayerWithScores = async (playerId: string) => {
    const player = await this.db.player.findFirstOrThrow({
      where: {
        id: playerId,
      },
      select: this.playerScoreSelect(),
    });
    const { wonMatches: _won, updatedAt, lostMatches: _lost, ...rest } = player;
    const lostMatches = _lost.length;
    const wonMatches = _won.length;
    return {
      ...rest,
      wonMatches,
      lostMatches,
      totalPlayedMatches: wonMatches + lostMatches,
    };
  };

  public readonly getPlayersWithScores = async (channelId: string) => {
    const players = await this.db.player.findMany({
      where: {
        channelId,
      },
      select: this.playerScoreSelect(),
    });
    return players.map(({ wonMatches: _won, lostMatches: _lost, ...rest }) => {
      const lostMatches = _lost.length;
      const wonMatches = _won.length;
      return {
        ...rest,
        wonMatches,
        lostMatches,
        totalPlayedMatches: wonMatches + lostMatches,
      };
    });
  };
}

export const prismaClientService = new PrismaClientService();
