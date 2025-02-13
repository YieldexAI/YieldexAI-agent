import { elizaLogger, Service, ServiceType, type IAgentRuntime } from "@elizaos/core";
import { APYProvider } from "../providers/apyProvider.ts";
import { stringToUuid } from "@elizaos/core";

export class APYMonitorService extends Service {
  private tweetInterval: NodeJS.Timeout | null = null;
  private memoryInterval: NodeJS.Timeout | null = null;
  private provider: APYProvider;

  get serviceType() {
    return 'apy_monitor' as ServiceType;
  }

  constructor() {
    super();
    this.provider = new APYProvider();
  }

  async initialize(runtime: IAgentRuntime): Promise<void> {
    // Get intervals from .env (in minutes)
    const tweetInterval = Number(process.env.APY_TWEET_INTERVAL || 1440); // Default: 24 hours
    const memoryInterval = Number(process.env.APY_MEMORY_UPDATE_INTERVAL || 20); // Default: 20 minutes

    // Tweet interval
    this.tweetInterval = setInterval(async () => {
      try {
        elizaLogger.info('📊 Checking APY updates for tweets...');
        const message = {
          id: stringToUuid('apy-monitor'),
          userId: runtime.agentId,
          agentId: runtime.agentId,
          roomId: runtime.agentId,
          content: { text: 'check apy' }
        };
        await this.provider.get(runtime, message);
      } catch (error) {
        elizaLogger.error('❌ Error checking APY for tweets:', error);
      }
    }, tweetInterval * 60 * 1000); // Convert minutes to milliseconds

    // Memory update interval
    this.memoryInterval = setInterval(async () => {
      try {
        elizaLogger.info('🧠 Checking new APY records for memory...');
        await this.provider.loadHistoricalData(runtime);
      } catch (error) {
        elizaLogger.error('❌ Error updating memory:', error);
      }
    }, memoryInterval * 60 * 1000); // Convert minutes to milliseconds
  }

  async stop(): Promise<void> {
    if (this.tweetInterval) {
      clearInterval(this.tweetInterval);
      this.tweetInterval = null;
    }
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
      this.memoryInterval = null;
    }
  }
} 