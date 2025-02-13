import { 
  elizaLogger, 
  type IAgentRuntime, 
  type Provider, 
  type Memory, 
  type State,
  stringToUuid,
  embed
} from "@elizaos/core";
import { createClient } from "@supabase/supabase-js";
import type { APYRecord } from "../types.ts";
import { PostAPYUpdateAction } from "../actions/postUpdate.ts";

interface MemoryMetadata {
  metadata: {
    apyData: APYRecord;
  };
}

export class APYProvider implements Provider {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );
  }

  async get(
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ): Promise<APYRecord[] | null> {
    elizaLogger.info('📥 APY Provider called');
    
    try {
      const { data, error } = await this.supabase
      .rpc('get_latest_apy') 
      .order('apy', { ascending: false })
      .limit(3);
  

      if (error) {
        elizaLogger.error('❌ Error fetching data:', error);
        return null;
      }

      if (!data || data.length === 0) {
        elizaLogger.info('ℹ️ No new APY updates found in last 24 hours');
        return null;
      }

      elizaLogger.info('✅ Found new APY updates, processing...');
      elizaLogger.info('APY Data:', data);

      const updatedState = {
        ...state,                    
        data,                      
        roomId: message.roomId      
      } as State;

      await PostAPYUpdateAction.handler(runtime, message, updatedState);

      return data as APYRecord[];

    } catch (error) {
      elizaLogger.error('❌ Error in APY provider:', error);
      return null;
    }
  }

  async loadHistoricalData(runtime: IAgentRuntime): Promise<void> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    try {
      elizaLogger.info('📥 Checking for new APY records...');
      
      const existingMemories = await runtime.messageManager.getMemories({
        roomId: runtime.agentId 
      });
      elizaLogger.info('Found existing memories:', existingMemories.length);
      
      const existingIds = new Set(
        existingMemories
          .filter(m => {
            const metadata = m.content?.metadata as MemoryMetadata['metadata'];
            return metadata?.apyData?.id;
          })
          .map(m => {
            const metadata = m.content?.metadata as MemoryMetadata['metadata'];
            return metadata.apyData.id;
          })
      );

      const query = this.supabase
        .from('apy_history')
        .select('*')
        .gte('created_at', oneDayAgo);

      if (existingIds.size > 0) {
        const idsArray = Array.from(existingIds).filter(Boolean); 
        if (idsArray.length > 0) {
          elizaLogger.info('Excluding existing IDs:', idsArray);
          idsArray.forEach(id => {
            query.neq('id', id);
          });
        }
      }

      const { data, error } = await query;

      if (error) {
        elizaLogger.error('❌ Error fetching data:', error);
        return;
      }

      if (!data || data.length === 0) {
        elizaLogger.info('ℹ️ No new records found');
        return;
      }

      elizaLogger.info(`✨ Found ${data.length} new records to add:`, data.map(r => r.id));

      for (const record of data) {
        elizaLogger.info(`Processing record ${record.id}...`);
        
        const text = `IMPORTANT DEFI APY INFORMATION:
Asset: ${record.asset} (${record.chain})
Protocol Name: ${record.pool_id}
Current APY Rate: ${record.apy}%
Total Value Locked (TVL): $${record.tvl ? (record.tvl / 1_000_000).toFixed(1) + 'M' : 'N/A'}
Date: ${new Date(record.created_at).toLocaleDateString()}

Key Information:
- This is yield farming data for ${record.asset} token
- The protocol ${record.pool_id} is running on ${record.chain} blockchain
- Current annual percentage yield is ${record.apy}%
- Total value locked indicates protocol security and popularity

Use Cases:
- Answer questions about ${record.asset} APY rates
- Compare yields between different protocols
- Provide historical APY data for ${record.chain}
- Reference when discussing DeFi opportunities

Keywords: DeFi, yield farming, APY, ${record.asset}, ${record.chain}, ${record.pool_id}, TVL, annual percentage yield, liquidity`;

        const embedding = await embed(runtime, text);

        await runtime.messageManager.createMemory({
          id: stringToUuid(`apy-history-${record.id}`),
          userId: runtime.agentId,
          agentId: runtime.agentId,
          roomId: runtime.agentId,
          content: {
            text,
            source: 'apy_history',
            type: 'historical_apy',
            metadata: {
              apyData: record,
              tags: ['defi', 'apy', record.asset, record.chain, record.pool_id],
              importance: 'high',
              category: 'yield_data'
            }
          },
          embedding,
          createdAt: new Date(record.created_at).getTime()
        });

        elizaLogger.info(`Saved record ${record.id} to memory`);
      }

      elizaLogger.info('✅ Memory update completed');
    } catch (error) {
      elizaLogger.error('❌ Error updating memory:', error);
    }
  }

  formatHistoricalRecord(record: APYRecord): string {
    const tvlFormatted = record.tvl ? 
      `$${(record.tvl / 1_000_000).toFixed(1)}M` : 
      'N/A';

    return `Asset: ${record.asset}
Chain: ${record.chain}
Protocol: ${record.pool_id}
APY: ${record.apy.toFixed(2)}%
TVL: ${tvlFormatted}`;
  }
} 