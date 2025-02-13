import type { Plugin } from "@elizaos/core";
import { APYProvider } from "./providers/apyProvider.ts";
import { PostAPYUpdateAction } from "./actions/postUpdate.ts";
import { APYMonitorService } from "./services/apyMonitorService.ts";
import TwitterClient from "@elizaos/client-twitter";
import { HandleApyQueryAction } from "./actions/handleApyQuery.ts";

const plugin: Plugin = {
    name: "apy-monitor",
    description: "Monitors APY changes and posts updates to Twitter",
    providers: [new APYProvider()],
    evaluators: [],
    services: [new APYMonitorService()],
    actions: [
        PostAPYUpdateAction,
        HandleApyQueryAction
    ],
    clients: []
};

export default plugin;
