import {
  parseFoodNutritionWithAI,
  testGeminiAPIConnection,
  getAIStatus,
} from '../aiService';

describe('AI Service & Error Status Code Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getAIStatus returns correct status labels by connection status', () => {
    expect(getAIStatus('', 'not_configured').connectionStatus).toBe('not_configured');
    expect(getAIStatus('AIzaSy...', 'connected').connectionStatus).toBe('connected');
    expect(getAIStatus('AIzaSy...', 'invalid_key').connectionStatus).toBe('invalid_key');
    expect(getAIStatus('AIzaSy...', 'rate_limited').connectionStatus).toBe('rate_limited');
  });

  test('testGeminiAPIConnection returns invalid_key for HTTP 401/403', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
    } as any);

    const status = await testGeminiAPIConnection('invalid_key_123');
    expect(status).toBe('invalid_key');
  });

  test('testGeminiAPIConnection returns rate_limited for HTTP 429', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
    } as any);

    const status = await testGeminiAPIConnection('key_429');
    expect(status).toBe('rate_limited');
  });

  test('parseFoodNutritionWithAI falls back to Smart Culinary Engine on invalid API key or network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const result = await parseFoodNutritionWithAI('Nasi Goreng Ayam', 'invalid_key');
    expect(result.isOnlineAI).toBe(false);
    expect(result.nutrition.calories).toBeGreaterThan(0);
    expect(result.itemsBreakdown.length).toBeGreaterThan(0);
  });
});
