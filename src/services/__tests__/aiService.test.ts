import {
  parseFoodNutritionWithAI,
  testGeminiAPIConnection,
  sendAICoachChatQuery,
  getAIStatus,
  parseNumber,
  safeExtractJsonObject,
  UserContextData,
} from '../aiService';

describe('AI Service Comprehensive Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // --- 1. Connection Status & Utility Tests ---
  test('getAIStatus returns correct status labels by connection status', () => {
    expect(getAIStatus('', 'not_configured').connectionStatus).toBe('not_configured');
    expect(getAIStatus('AIzaSy...', 'connected').connectionStatus).toBe('connected');
    expect(getAIStatus('AIzaSy...', 'invalid_key').connectionStatus).toBe('invalid_key');
    expect(getAIStatus('AIzaSy...', 'rate_limited').connectionStatus).toBe('rate_limited');
    expect(getAIStatus('AIzaSy...', 'offline').connectionStatus).toBe('offline');
    expect(getAIStatus('AIzaSy...', 'offline').modeLabel).toContain('Koneksi Terputus');
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

  test('testGeminiAPIConnection returns offline on network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const status = await testGeminiAPIConnection('any_key');
    expect(status).toBe('offline');
    expect(global.fetch).toHaveBeenCalledTimes(1); // Stops immediately on network error
  });

  // --- 2. Decimal, Calories & Parser Robustness Suite ---
  test('parseNumber preserves decimals and rejects negative numbers', () => {
    expect(parseNumber(12.5, 0)).toBe(12.5);
    expect(parseNumber('16.25', 0)).toBe(16.3); // rounded to 1 decimal
    expect(parseNumber(-10, 5)).toBe(5); // negative rejected, fallback used
    expect(parseNumber(undefined, 15)).toBe(15);
  });

  test('safeExtractJsonObject handles markdown blocks, invalid JSON, and non-object responses', () => {
    const validMarkdown = '```json\n{"name": "Nasi"}\n```';
    expect(safeExtractJsonObject(validMarkdown)).toEqual({ name: 'Nasi' });

    expect(safeExtractJsonObject('invalid json string')).toBeNull();
    expect(safeExtractJsonObject('["array", "instead", "of", "object"]')).toBeNull();
  });

  test('parseFoodNutritionWithAI preserves decimal nutrients', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                name: 'Dada Ayam Panggang',
                calories: 250,
                proteinGrams: 32.5,
                carbsGrams: 2.4,
                fatGrams: 5.8,
                fiberGrams: 0.5,
                itemsBreakdown: [{ name: 'Dada Ayam', calories: 250 }],
              }),
            }],
          },
        }],
      }),
    } as any);

    const result = await parseFoodNutritionWithAI('Dada Ayam Panggang', 'valid_key');
    expect(result.isOnlineAI).toBe(true);
    expect(result.nutrition.proteinGrams).toBe(32.5);
    expect(result.nutrition.carbsGrams).toBe(2.4);
    expect(result.nutrition.fatGrams).toBe(5.8);
    expect(result.nutrition.fiberGrams).toBe(0.5);
  });

  test('parseFoodNutritionWithAI preserves overall dish calories when breakdown total is smaller', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                name: 'Nasi Uduk Komplit',
                calories: 600,
                proteinGrams: 20,
                carbsGrams: 65,
                fatGrams: 22,
                itemsBreakdown: [
                  { name: 'Nasi', calories: 200 },
                  { name: 'Ayam', calories: 180 },
                ], // breakdown sum = 380
              }),
            }],
          },
        }],
      }),
    } as any);

    const result = await parseFoodNutritionWithAI('Nasi Uduk Komplit', 'valid_key');
    expect(result.nutrition.calories).toBe(600); // 600 preserved, not overwritten by 380!
  });

  test('parseFoodNutritionWithAI stops immediately on network error without retrying remaining models', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network offline'));

    const result = await parseFoodNutritionWithAI('Nasi Goreng', 'valid_key');
    expect(result.isOnlineAI).toBe(false);
    expect(result.aiNotes).toContain('Koneksi ke Gemini Cloud terputus');
    expect(global.fetch).toHaveBeenCalledTimes(1); // STOPPED IMMEDIATELY ON 1st ATTEMPT!
  });

  // --- 3. sendAICoachChatQuery Suite ---
  const mockUserContext: UserContextData = {
    fastingHours: 14,
    caloriesIn: 800,
    netDeficit: 400,
    steps: 6500,
    waterGlasses: 5,
  };

  test('sendAICoachChatQuery returns response text on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ text: 'Puasamu 14 jam sudah sangat baik! Teruskan hidrasimu.' }],
          },
        }],
      }),
    } as any);

    const reply = await sendAICoachChatQuery('apakah puasa 14 jam bagus?', 'Budi', mockUserContext, 'valid_key');
    expect(reply).toBe('Puasamu 14 jam sudah sangat baik! Teruskan hidrasimu.');
  });

  test('sendAICoachChatQuery stops immediately on 401/403 invalid key', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
    } as any);

    const reply = await sendAICoachChatQuery('halo', 'Budi', mockUserContext, 'invalid_key');
    expect(reply).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(1); // STOPS IMMEDIATELY ON INVALID KEY
  });

  test('sendAICoachChatQuery falls back to next model on 429 rate limit', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 429 } as any) // 1st model rate limited
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Jawaban dari model ke-2.' }] } }],
        }),
      } as any);

    const reply = await sendAICoachChatQuery('tips gizi', 'Budi', mockUserContext, 'key_429');
    expect(reply).toBe('Jawaban dari model ke-2.');
    expect(global.fetch).toHaveBeenCalledTimes(2); // Retried model #2 on 429
  });

  test('sendAICoachChatQuery stops immediately on network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network Error'));

    const reply = await sendAICoachChatQuery('halo', 'Budi', mockUserContext, 'valid_key');
    expect(reply).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(1); // STOPS IMMEDIATELY ON NETWORK ERROR
  });

  test('sendAICoachChatQuery respects max 3 fallback attempts limit', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
    } as any);

    const reply = await sendAICoachChatQuery('halo', 'Budi', mockUserContext, 'valid_key');
    expect(reply).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(3); // Capped at MAX 3 ATTEMPTS
  });

  test('sendAICoachChatQuery returns null on empty response payload', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [] }),
    } as any);

    const reply = await sendAICoachChatQuery('halo', 'Budi', mockUserContext, 'valid_key');
    expect(reply).toBeNull();
  });
});
