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

  public readonly addHandler = (handler: Handler) => {
    this.#handlers.push(handler);
  };

  public readonly addManifestItem = (manifestItem: ManifestItem[]) => {
    this.#manifestItems.push(...manifestItem);
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
