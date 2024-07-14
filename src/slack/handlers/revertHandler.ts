import { SlackApp } from "slack-cloudflare-workers";
import { handlerService } from "../../handlerService";
import { prismaClientService } from "../../prismaClientService";

export const REVERT_COMMAND = "!whoops";
export const REVERT_REGEX = new RegExp(`${REVERT_COMMAND}`, "im");

export const revertLastMatch = async (channelId: string) => {
  const lastMatch = await prismaClientService.db.match.findFirst({
    where: {
      channelId: channelId,
    },
    orderBy: {
      timestamp: "desc",
    },
    select: {
      id: true,
      winner: {
        select: {
          initials: true,
        },
      },
      looser: {
        select: {
          initials: true,
        },
      },
      timestamp: true,
    },
  });
  if (!lastMatch) {
    return;
  }

  await prismaClientService.db.elo.deleteMany({
    where: {
      matchId: lastMatch.id,
    },
  });
  await prismaClientService.db.glicko2.deleteMany({
    where: {
      matchId: lastMatch.id,
    },
  });
  await prismaClientService.db.trueSkill.deleteMany({
    where: {
      matchId: lastMatch.id,
    },
  });
  await prismaClientService.db.match.delete({
    where: {
      id: lastMatch.id,
    },
    include: { elo: true, glicko2: true, trueSkill: true },
  });

  return lastMatch;
};

const addRevertHandler = (app: SlackApp<SlackAppEnv>) => {
  app.message(REVERT_REGEX, async ({ context, payload }) => {
    const channel = await prismaClientService.db.channel.findUnique({
      where: { id: payload.channel },
    });
    if (!channel) {
      await context.client.chat.postEphemeral({
        channel: payload.channel,
        user: payload.user!,
        text: "Channel not found, please import the channel first",
      });
      return;
    }

    const deletedMatch = await revertLastMatch(payload.channel);

    if (!deletedMatch) {
      await context.client.chat.postEphemeral({
        channel: payload.channel,
        user: payload.user!,
        text: "No match to revert",
      });
      return;
    }
    await context.client.chat.postMessage({
      channel: payload.channel,
      text: `Match reverted: ${deletedMatch.winner.initials} vs ${deletedMatch.looser.initials} at ${deletedMatch.timestamp}`,
    });
  });
};

handlerService.addHandler(addRevertHandler);
handlerService.addMessageCommand(
  REVERT_COMMAND,
  "Revert the last match in the channel"
);
