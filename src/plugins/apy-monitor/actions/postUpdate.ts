import { type Action, elizaLogger, type IAgentRuntime, type Memory, type State, stringToUuid, getEmbeddingZeroVector } from "@elizaos/core";
import type { APYRecord } from "../types.ts";

export const PostAPYUpdateAction: Action = {
  name: "POST_APY_UPDATE",
  description: "Posts APY update to Twitter",
  similes: ['post apy update', 'tweet apy'],
  examples: [],
  
  async validate() {
    return true;
  },
  
  async handler(runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> {
    try {
      const apyData = state?.data as APYRecord[];
      if (!apyData || apyData.length === 0) {
        return false;
      }
      
      const tweetText = formatTweet(apyData);

      const manager = Array.isArray(runtime.clients) 
        ? runtime.clients.find(c => c?.client?.twitterClient)
        : Object.values(runtime.clients || {}).find(c => c?.client?.twitterClient);

      if (!manager) {
        return false;
      }

      elizaLogger.info('🚀 Posting tweet:', tweetText);
      await manager.client.twitterClient.sendTweet(tweetText);
      elizaLogger.info('✅ Tweet sent');

      return true;
    } catch (error) {
      elizaLogger.error('Error posting tweet:', error);
      return false;
    }
  }
};

function formatTweet(entries: APYRecord[]): string {
  return entries.map((entry, index) => {
    const tvlFormatted = entry.tvl ? 
      `$${(entry.tvl / 1_000_000).toFixed(1)}M` : 
      'N/A';

    return `🏆 #${index + 1}
Asset: ${entry.asset}
Chain: ${entry.chain}
Protocol: ${entry.pool_id}
APY: ${entry.apy.toFixed(2)}%
TVL: ${tvlFormatted}`;
  }).join('\n\n');
}

export default PostAPYUpdateAction;
