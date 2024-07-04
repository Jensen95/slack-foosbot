import { eloService } from "./eloService";
import { glicko2Service } from "./glicko2Service";
import { trueSkillService } from "./trueSkillService";
import type {
  EloScore,
  GlickoScore,
  TrueSkillScore,
  PlayerVsPlayer,
} from "./playerVsPlayer.types";

interface PvPScores {
  elo: EloScore;
  glicko2: GlickoScore;
  trueSkill: TrueSkillScore;
}

const scoringModels: [score: string, model: PlayerVsPlayer<any>][] = [
  ["elo", eloService],
  ["glicko2", glicko2Service],
  ["trueSkill", trueSkillService],
];
const runModels =
  <T extends keyof PlayerVsPlayer<PvPScores>>(call: T) =>
  (...args: Parameters<PlayerVsPlayer<PvPScores>[T]>) =>
    scoringModels.reduce((acc, [score, model]) => {
      const result = model[call].apply(null, args as any);
      return {
        ...acc,
        [score]: result,
      };
    }, {} as ReturnType<PlayerVsPlayer<PvPScores>[T]>);

class PlayerVsPlayerService implements PlayerVsPlayer<PvPScores> {
  public readonly match = (winner: PvPScores, looser: PvPScores) => {
    const elo = eloService.match(winner.elo, looser.elo);
    const glicko2 = glicko2Service.match(winner.glicko2, looser.glicko2);
    const trueSkill = trueSkillService.match(
      winner.trueSkill,
      looser.trueSkill
    );
    return {
      winner: {
        elo: elo.winner,
        glicko2: glicko2.winner,
        trueSkill: trueSkill.winner,
      },
      looser: {
        elo: elo.looser,
        glicko2: glicko2.looser,
        trueSkill: trueSkill.looser,
      },
    };

    return runModels("match")(winner, looser);
  };

  public readonly newPlayer = () => {
    return runModels("newPlayer")();
  };
}

export const playerVsPlayerService = new PlayerVsPlayerService();
