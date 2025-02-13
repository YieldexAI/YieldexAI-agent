import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseDatabaseAdapter } from '../src/index.js';
import { type UUID, elizaLogger } from '@elizaos/core';
import { createClient } from '@supabase/supabase-js';

// Mock the elizaLogger
vi.mock('@elizaos/core', async () => {
    const actual = await vi.importActual('@elizaos/core');
    return {
        ...actual as any,
        elizaLogger: {
            error: vi.fn()
        }
    };
});

// Create mock response objects
const mockResponse = {
    data: { id: 'test-room-id' },
    error: null
};

const mockChain = {
    maybeSingle: vi.fn().mockResolvedValue(mockResponse),
    single: vi.fn().mockResolvedValue(mockResponse),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
};

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => mockChain)
}));

describe('SupabaseDatabaseAdapter', () => {
    let adapter: SupabaseDatabaseAdapter;
    
    beforeEach(() => {
        vi.clearAllMocks();
        adapter = new SupabaseDatabaseAdapter('url', 'key');
    });

    // ... rest of tests
}); 