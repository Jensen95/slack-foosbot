import { SlackApp } from "slack-cloudflare-workers";
import { handlerService } from "../handlerService";

const addMatchHandlers = (app: SlackApp<any>) => {
  app.message(/^!game [A-Za-z]{3} [A-Za-z]{3}/, async () => {
    console.log("Match detected");
  });
};

handlerService.addHandler(addMatchHandlers);
