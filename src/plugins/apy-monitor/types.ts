export interface APYRecord {
  id: string;
  asset: string;
  chain: string;
  apy: number;
  timestamp: number;
  pool_id: string;
  created_at: string;
  tvl: number | null;
} 