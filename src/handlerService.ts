import { SlackApp } from "slack-cloudflare-workers";

type Handler = (app: SlackApp<any>) => void;

type ManifestItem = ShortCutItem;

type ShortCutItem = ManifestItemBase & { type: "message" | "global" };

interface ManifestItemBase {
  name: string;
  type: unknown;
  callbackId: string;
  description: string;
}

class HandlerService {
  #handlers: Handler[] = [];
  #manifestItems: ManifestItem[] = [];
  #messageCommands: { command: string; description: string }[] = [];

  public readonly addHandler = (handler: Handler) => {
    this.#handlers.push(handler);
  };

  public readonly addManifestItem = (manifestItem: ManifestItem[]) => {
    this.#manifestItems.push(...manifestItem);
  };

  public readonly addMessageCommand = (
    command: `!${string}`,
    description: string
  ) => {
    this.#messageCommands.push({ command, description });
  };

  public readonly getCommandHelp = (recivedCommand?: string) => {
    return [
      ...(recivedCommand
        ? [
            "Invalid command received",
            `'${recivedCommand}', is one of the following commands:`,
            "",
          ]
        : ["Available commands:", ""]),
      ...this.#messageCommands.map(
        ({ command, description }) => `${command} - ${description}`
      ),
    ].join("\n");
  };

  public readonly applyHandlersToApp = (app: SlackApp<any>) => {
    this.#handlers.forEach((handler) => handler(app));
    return app;
  };

  public generateManifest = () => {
    // Generate slack manifest

    return JSON.stringify(this.#manifestItems);
  };
}

export const handlerService = new HandlerService();
