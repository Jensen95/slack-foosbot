import type { Elo, Glicko2, TrueSkill } from "@prisma/client";

export type ScoreCleanedFromDb<T> = Omit<T, "id" | "playerId" | "updatedAt">;

export type EloScore = ScoreCleanedFromDb<Elo>;
export type GlickoScore = ScoreCleanedFromDb<Glicko2>;
export type TrueSkillScore = ScoreCleanedFromDb<TrueSkill>;
type Scores = EloScore | GlickoScore | TrueSkillScore;

export interface PlayerVsPlayer<Score> {
  readonly match: (
    winner: Score,
    looser: Score
  ) => { winner: Score; looser: Score };
  readonly newPlayer: () => Score;
}
