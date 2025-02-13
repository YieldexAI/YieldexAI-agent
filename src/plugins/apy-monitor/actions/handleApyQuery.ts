import { type Action, elizaLogger, type IAgentRuntime, type Memory, type State, stringToUuid, embed } from "@elizaos/core";
import type { APYRecord } from "../types.ts";

export const HandleApyQueryAction: Action = {
  name: "HANDLE_APY_QUERY",
  description: "Handles questions about APY rates, yields, and protocols using memory data",
  similes: [
    'what is the best apy',
    'highest yield',
    'apy for usdc',
    'top apy',    
    'best rates',
    'compare protocols',
    'protocol tvl',
    'safest protocol',
    'which chain has best apy',
    'show me yields',
    'check apy rates'
  ],
  examples: [],

  async validate(runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    const text = message.content.text.toLowerCase();
    
    // Check for keywords in the question
    const hasKeyword = text.includes('apy') || 
                      text.includes('yield') || 
                      text.includes('rate') ||
                      text.includes('protocol') ||
                      text.includes('tvl');

    // Check for data in memory
    if (hasKeyword) {
      const embedding = await embed(runtime, text);
      const memories = await runtime.databaseAdapter.searchMemories({
        tableName: 'memories',
        agentId: runtime.agentId,
        roomId: message.roomId,
        embedding,
        match_threshold: 0.7,
        match_count: 3,
        unique: true
      });
      return memories.length > 0;
    }

    return false;
  },

  async handler(runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> {
    try {
      const question = message.content.text.toLowerCase();

      // Search for relevant data in memory with context
      const embedding = await embed(runtime, question);
      const memories = await runtime.databaseAdapter.searchMemories({
        tableName: 'memories',
        agentId: runtime.agentId,
        roomId: message.roomId,
        embedding,
        match_threshold: 0.8,
        match_count: 10,
        unique: true
      });

      // Extract APY data
      const apyData = memories
        .map(m => (m.content.metadata as { apyData: APYRecord }).apyData)
        .filter(Boolean);

      if (!apyData.length) {
        // Create "no data" response
        await runtime.messageManager.createMemory({
          id: stringToUuid(`apy-response-${Date.now()}`),
          userId: runtime.agentId,
          agentId: runtime.agentId,
          roomId: message.roomId,
          content: {
            text: "I don't have relevant data in my memory for this specific query. Please try asking about general APY rates or specific protocols I track.",
            source: 'apy_query',
            type: 'response',
            metadata: {
              queryType: 'no_data'
            }
          }
        });
        return true;
      }

      // Filter and sort data based on query type
      const responseData = filterDataByQuery(question, apyData);
      
      // Create response via messageManager
      await runtime.messageManager.createMemory({
        id: stringToUuid(`apy-response-${Date.now()}`),
        userId: runtime.agentId,
        agentId: runtime.agentId,
        roomId: message.roomId,
        content: {
          text: formatResponse(question, responseData),
          source: 'apy_query',
          type: 'response',
          metadata: {
            queryData: responseData,
            queryType: getQueryType(question)
          }
        }
      });

      return true;
    } catch (error) {
      elizaLogger.error('Error handling APY query:', error);
      return false;
    }
  }
};

// Вспомогательные функции
function getQueryType(question: string): string {
  if (question.includes('best') || question.includes('highest')) return 'best_apy';
  if (question.includes('compare')) return 'comparison';
  if (question.includes('safe') || question.includes('tvl')) return 'security';
  return 'general';
}

function filterDataByQuery(question: string, data: APYRecord[]): APYRecord[] {
  // Filter by asset if specified
  const assets = ['usdc', 'usdt', 'dai', 'eth',"lusd"];
  for (const asset of assets) {
    if (question.includes(asset)) {
      const assetData = data.filter(d => d.asset.toLowerCase().includes(asset));
      if (assetData.length) return assetData.sort((a, b) => b.apy - a.apy);
    }
  }
  
  // Filter by chain if specified
  const chains = {
    'ethereum': ['ethereum', 'eth'],
    'optimism': ['optimism', 'op'],
    'arbitrum': ['arbitrum', 'arb'],
    'polygon': ['polygon', 'matic'],
    'bsc': ['bsc', 'binance'],
    'gnosis': ['gnosis', 'xdai'],
    'avalanche': ['avalanche', 'avax']
  };

  for (const [chain, aliases] of Object.entries(chains)) {
    if (aliases.some(alias => question.includes(alias))) {
      const chainData = data.filter(d => d.chain.toLowerCase() === chain);
      if (chainData.length) {
        return chainData.sort((a, b) => b.apy - a.apy);
      } else {
        // If no data found for this chain, return empty array to trigger "no data" response
        return [];
      }
    }
  }

  // Default: return all data sorted by APY
  return data.sort((a, b) => b.apy - a.apy);
}

function formatResponse(question: string, data: APYRecord[]): string {
  if (data.length === 0) {
    return "I don't have any current APY data for this specific network/asset in my memory. Please try asking about other networks or check general APY rates.";
  }

  const type = getQueryType(question);
  
  switch (type) {
    case 'best_apy':
      const best = data[0];
      return `Based on my current data, on ${best.chain} the highest APY is ${best.apy.toFixed(2)}% for ${best.asset} via ${best.pool_id} (TVL: $${(best.tvl / 1_000_000).toFixed(1)}M)`;
    
    case 'comparison':
      return `Here are the current top yields from my data:\n\n${
        data.map(d => 
          `${d.asset} on ${d.chain}: ${d.apy.toFixed(2)}% (${d.pool_id})`
        ).join('\n')
      }`;
    
    case 'security':
      const sorted = [...data].sort((a, b) => b.tvl - a.tvl);
      return `Based on TVL data, ${sorted[0].pool_id} has the highest security with $${(sorted[0].tvl / 1_000_000).toFixed(1)}M TVL and offers ${sorted[0].apy.toFixed(2)}% APY`;
    
    default:
      return `Here are the current yields from my data:\n\n${
        data.map(d => 
          `${d.asset} (${d.chain}):\n` +
          `• APY: ${d.apy.toFixed(2)}%\n` +
          `• Protocol: ${d.pool_id}\n` +
          `• TVL: $${(d.tvl / 1_000_000).toFixed(1)}M`
        ).join('\n\n')
      }`;
  }
}

export default HandleApyQueryAction; 