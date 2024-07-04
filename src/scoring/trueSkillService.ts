import {
  rate,
  quality,
  Rating,
  quality_1vs1,
  rate_1vs1,
  winProbability,
  TrueSkill,
} from "ts-trueskill";
import { PlayerVsPlayer, TrueSkillScore } from "./playerVsPlayer.types";
import { Prisma } from "@prisma/client";

// MU is the skill level of the

class TrueSkillService implements PlayerVsPlayer<TrueSkillScore> {
  #ts = new TrueSkill(25, undefined, undefined, undefined, 0);
  public readonly match = (winner: TrueSkillScore, looser: TrueSkillScore) => {
    // Figure out why it gives floating point error
    // const _winner = new Rating(
    //   new SkillGaussian(
    //     winner.mu.toNumber(),
    //     winner.sigma.toNumber(),
    //     winner.pi.toNumber(),
    //     winner.tau.toNumber()
    //   )
    // );
    // const _looser = new Rating(
    //   new SkillGaussian(
    //     looser.mu.toNumber(),
    //     looser.sigma.toNumber(),
    //     looser.pi.toNumber(),
    //     looser.tau.toNumber()
    //   )
    // );
    const _winner = new Rating(winner.mu.toNumber(), winner.sigma.toNumber());
    const _looser = new Rating(looser.mu.toNumber(), looser.sigma.toNumber());
    const [newWinner, newLooser] = rate_1vs1(
      _winner,
      _looser,
      false,
      undefined,
      this.#ts
    );
    return {
      winner: {
        mu: new Prisma.Decimal(newWinner.mu),
        sigma: new Prisma.Decimal(newWinner.sigma),
        pi: new Prisma.Decimal(newWinner.pi),
        tau: new Prisma.Decimal(newWinner.tau),
      },
      looser: {
        mu: new Prisma.Decimal(newLooser.mu),
        sigma: new Prisma.Decimal(newLooser.sigma),
        pi: new Prisma.Decimal(newLooser.pi),
        tau: new Prisma.Decimal(newLooser.tau),
      },
    };
  };
  public readonly newPlayer = () => {
    const player = this.#ts.createRating();
    return {
      mu: new Prisma.Decimal(player.mu),
      sigma: new Prisma.Decimal(player.sigma),
      pi: new Prisma.Decimal(player.pi),
      tau: new Prisma.Decimal(player.tau),
    };
  };
}

export const trueSkillService = new TrueSkillService();

/**
 * A model for the normal distribution.
 */
class SkillGaussian {
  /**
   * @param pi - Precision, the inverse of the variance.
   * @param tau - Precision adjusted mean, the precision multiplied by the mean
   */
  constructor(
    mu: number | null = null,
    sigma: number | null = null,
    public pi = 0,
    public tau = 0
  ) {
    if (mu !== null) {
      if (sigma === null) {
        throw new TypeError("sigma argument is needed");
      }

      if (sigma === 0) {
        throw new Error("sigma**2 should be greater than 0");
      }

      pi = sigma ** -2;
      tau = pi * mu;
    }

    this.pi = pi;
    this.tau = tau;
  }

  /**
   * A property which returns the mean.
   */
  get mu(): number {
    return this.pi && this.tau / this.pi;
  }

  get sigma(): number {
    if (this.pi) {
      return Math.sqrt(1 / this.pi);
    }

    return Infinity;
  }

  mul(other: SkillGaussian): SkillGaussian {
    const pi = this.pi + other.pi;
    const tau = this.tau + other.tau;
    return new SkillGaussian(null, null, pi, tau);
  }

  div(other: SkillGaussian): SkillGaussian {
    const pi = this.pi - other.pi;
    const tau = this.tau - other.tau;
    return new SkillGaussian(null, null, pi, tau);
  }

  toString(): string {
    const mu = this.mu.toPrecision(3);
    const sigma = this.sigma.toPrecision(3);
    return `N(mu=${mu}, sigma=${sigma})`;
  }
}
