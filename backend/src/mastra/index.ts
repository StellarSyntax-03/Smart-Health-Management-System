import { Mastra } from "@mastra/core";
import { healthAgents } from "./agents/healthAgent.js";

const agentsMap = Object.fromEntries(healthAgents.map((a) => [a.id, a]));

export const mastra = new Mastra({
  agents: agentsMap,
});

export { healthAgents };
