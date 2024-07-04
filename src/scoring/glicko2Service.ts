import { Glicko2, Player } from "glicko2";
import { PlayerVsPlayer, GlickoScore } from "./playerVsPlayer.types";
import { Prisma } from "@prisma/client";

class Glicko2Service implements PlayerVsPlayer<GlickoScore> {
  #glicko2 = new Glicko2({
    tau: 0.5,
    rating: 1500,
    rd: 200,
    vol: 0.06,
  });

  public readonly match = (winner: GlickoScore, looser: GlickoScore) => {
    const _winner = this.#glicko2.makePlayer(
      winner.rating.toNumber(),
      winner.rd.toNumber(),
      winner.vol.toNumber()
    );
    const _looser = this.#glicko2.makePlayer(
      looser.rating.toNumber(),
      looser.rd.toNumber(),
      looser.vol.toNumber()
    );
    const matches: [Player, Player, number][] = [[_winner, _looser, 1]];
    this.#glicko2.updateRatings(matches);
    return {
      winner: {
        rating: new Prisma.Decimal(_winner.getRating()),
        rd: new Prisma.Decimal(_winner.getRd()),
        vol: new Prisma.Decimal(_winner.getVol()),
      },
      looser: {
        rating: new Prisma.Decimal(_looser.getRating()),
        rd: new Prisma.Decimal(_looser.getRd()),
        vol: new Prisma.Decimal(_looser.getVol()),
      },
    };
  };

  public readonly newPlayer = () => {
    const player = this.#glicko2.makePlayer(1500);
    return {
      rating: new Prisma.Decimal(player.getRating()),
      rd: new Prisma.Decimal(player.getRd()),
      vol: new Prisma.Decimal(player.getVol()),
    };
  };
}

export const glicko2Service = new Glicko2Service();
