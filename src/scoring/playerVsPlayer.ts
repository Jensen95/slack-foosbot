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

// Maybe have a picker of values?
const scoringModels: [score: string, model: PlayerVsPlayer<any>][] = [
  ["elo", eloService],
  ["glicko2", glicko2Service],
  ["trueSkill", trueSkillService],
];

const runModels =
  <T extends keyof PlayerVsPlayer<PvPScores>>(call: T) =>
  (...args: Parameters<PlayerVsPlayer<PvPScores>[T]>) =>
    scoringModels.reduce((acc, [score, model]) => {
      const [winner = {}, looser = {}] = args as any;
      return {
        ...acc,
        [score]: model[call](winner[score], looser[score]),
      };
    }, {} as ReturnType<PlayerVsPlayer<PvPScores>[T]>);

class PlayerVsPlayerService implements PlayerVsPlayer<PvPScores> {
  public readonly match = (winner: PvPScores, looser: PvPScores) => {
    return runModels("match")(winner, looser);
  };

  public readonly newPlayer = () => {
    return runModels("newPlayer")();
  };
}

export const playerVsPlayerService = new PlayerVsPlayerService();
