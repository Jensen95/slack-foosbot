import { PlayerVsPlayer, EloScore } from "./playerVsPlayer.types";
import { Player, Duel } from "teslo";
import { Prisma } from "@prisma/client";

class EloService implements PlayerVsPlayer<EloScore> {
  public readonly match = (winner: EloScore, looser: EloScore) => {
    const duel = new Duel();
    duel.addPlayer(new Player("1", winner.elo.toNumber()));
    duel.addPlayer(new Player("2", looser.elo.toNumber()));
    const [_winner, _looser] = duel.calculate("1");

    return {
      winner: {
        elo: new Prisma.Decimal(_winner.elo),
      },
      looser: {
        elo: new Prisma.Decimal(_looser.elo),
      },
    };
  };

  public readonly newPlayer = () => {
    const player = new Player("1", 1500);
    return {
      elo: new Prisma.Decimal(player.elo),
    };
  };
}

export const eloService = new EloService();
