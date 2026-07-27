import {
  parseFoodNutritionWithAI,
  testGeminiAPIConnection,
  sendAICoachChatQuery,
  sendStructuredAICoachChatQuery,
  generateDailyInsight,
  generateWeeklyInsight,
  getAIStatus,
  parseNumber,
  safeExtractJsonObject,
  UserContextData,
  GEMINI_MODELS,
  MAX_FALLBACK_ATTEMPTS,
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
  test('configures all 14 requested models as the fallback chain', () => {
    expect(GEMINI_MODELS).toHaveLength(14);
    expect(GEMINI_MODELS).toEqual(
      expect.arrayContaining([
        'gemini-2.5-flash',
        'gemini-3.5-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.1-flash-lite',
        'gemini-3.1-flash-lite-preview',
        'gemini-3-flash-preview',
        'gemini-flash-latest',
        'gemini-flash-lite-latest',
        'gemini-2.5-pro',
        'gemini-3.5-pro',
        'gemini-pro-latest',
        'gemma-4-26b-a4b-it',
        'gemma-4-31b-it',
      ])
    );
    expect(MAX_FALLBACK_ATTEMPTS).toBe(GEMINI_MODELS.length);
  });

  test('getAIStatus returns correct status labels by connection status', () => {
    expect(getAIStatus('', 'not_configured').connectionStatus).toBe('not_configured');
    expect(getAIStatus('AIzaSy...', 'connected').connectionStatus).toBe('connected');
    expect(getAIStatus('AIzaSy...', 'invalid_key').connectionStatus).toBe('invalid_key');
    expect(getAIStatus('AIzaSy...', 'rate_limited').connectionStatus).toBe('rate_limited');
    expect(getAIStatus('AIzaSy...', 'offline').connectionStatus).toBe('offline');
    expect(getAIStatus('AIzaSy...', 'offline').modeLabel).toContain('offline');
  });

  test('testGeminiAPIConnection returns invalid_key for HTTP 401/403', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
    } as any);

    const status = await testGeminiAPIConnection('invalid_key_123');
    expect(status).toBe('invalid_key');
  });

  test('testGeminiAPIConnection recognizes API_KEY_INVALID in an HTTP 400 response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: 400,
          message: 'API key not valid. Please pass a valid API key.',
          details: [{ reason: 'API_KEY_INVALID' }],
        },
      }),
    } as any);

    const status = await testGeminiAPIConnection('invalid_key_400');
    expect(status).toBe('invalid_key');
    expect(global.fetch).toHaveBeenCalledTimes(1);
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

    const [requestUrl, requestOptions] = (global.fetch as jest.Mock).mock.calls[0];
    expect(requestUrl).not.toContain('valid_key');
    expect(requestOptions.headers['x-goog-api-key']).toBe('valid_key');
    const requestBody = JSON.parse(requestOptions.body);
    expect(requestBody.generationConfig.temperature).toBeUndefined();
    expect(requestBody.generationConfig.thinkingConfig).toEqual({
      thinkingLevel: 'minimal',
    });
    expect(
      requestBody.generationConfig.responseFormat.text.mimeType
    ).toBe('APPLICATION_JSON');
    expect(
      requestBody.generationConfig.responseFormat.text.schema.type
    ).toBe('object');
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
    expect(result.aiNotes).toContain('Gemini belum dapat dihubungi');
    expect(global.fetch).toHaveBeenCalledTimes(1); // STOPPED IMMEDIATELY ON 1st ATTEMPT!
  });

  test('local food parser refuses unknown descriptions instead of inventing default calories', async () => {
    await expect(
      parseFoodNutritionWithAI('xyzzy objek misterius')
    ).rejects.toThrow('belum dikenali');
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

  test('sendAICoachChatQuery exhausts all configured models on rate limits', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
    } as any);

    const reply = await sendAICoachChatQuery('halo', 'Budi', mockUserContext, 'valid_key');
    expect(reply).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(14);
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

  test('generateDailyInsight cannot override the deterministic hunger action', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                headline: 'Ayo makan besar',
                body: 'Model mencoba menyarankan makan.',
                recommendedAction: 'meal',
                suggestedPrompt: 'Apa pilihan berikutnya?',
              }),
            }],
          },
        }],
      }),
    } as any);

    const insight = await generateDailyInsight(
      {
        name: 'Budi',
        currentHour: 20,
        caloriesIn: 1900,
        targetCalories: 1800,
        maintenanceCalories: 2300,
        remainingCalories: -100,
        proteinGrams: 70,
        targetProteinGrams: 100,
        waterGlasses: 4,
        steps: 5000,
        fastingHours: 2,
        snackCount: 2,
        recentMeals: [],
        lastHungerCheck: {
          answer: 'hungry',
          signal: 'specific_craving',
          intent: 'snack',
          decisionKind: 'water',
        },
      },
      'valid_key'
    );

    expect(insight?.recommendedAction).toBe('water');
    expect(insight?.headline).toBe('Protein masih perlu perhatian.');
    expect(insight?.body).toContain('30 g');
    expect(insight?.headline).not.toContain('makan besar');
    expect(insight?.body).not.toContain('Model mencoba');
  });

  test('generateDailyInsight does not treat intake below maintenance as surplus', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                headline: 'Silakan tambah makan',
                body: 'Masih aman untuk makan besar.',
                recommendedAction: 'meal',
                suggestedPrompt: 'Apa pilihan porsi kecil?',
              }),
            }],
          },
        }],
      }),
    } as any);

    const insight = await generateDailyInsight(
      {
        name: 'Budi',
        currentHour: 21,
        caloriesIn: 1950,
        targetCalories: 1800,
        maintenanceCalories: 2300,
        remainingCalories: -150,
        proteinGrams: 80,
        targetProteinGrams: 100,
        waterGlasses: 6,
        steps: 5000,
        fastingHours: 1,
        snackCount: 1,
        recentMeals: [],
        lastHungerCheck: {
          answer: 'hungry',
          signal: 'physical',
          intent: 'meal',
          decisionKind: 'meal',
        },
      },
      'valid_key'
    );

    expect(insight).toMatchObject({
      headline: 'Protein masih perlu perhatian.',
      recommendedAction: 'meal',
      suggestedPrompt: 'Apa pilihan porsi kecil?',
    });
    expect(insight?.body).toContain('20 g');
  });

  test('structured coach includes bounded multi-turn history and rich context', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                message: 'Coba mulai dari satu gelas air.',
                followUps: ['Masih lapar setelah 10 menit?'],
                recommendedAction: 'water',
                safetyNote: '',
              }),
            }],
          },
        }],
      }),
    } as any);

    const response = await sendStructuredAICoachChatQuery(
      'Lalu apa?',
      'Budi',
      {
        ...mockUserContext,
        targetCalories: 1800,
        remainingCalories: 400,
        proteinGrams: 60,
        targetProteinGrams: 100,
        recentMeals: [
          { name: 'Soto ayam', calories: 420, proteinGrams: 28, isSnack: false },
        ],
      },
      'valid_key',
      [
        { role: 'user', text: 'Aku ragu lapar.' },
        { role: 'model', text: 'Coba cek sinyal tubuhmu.' },
      ]
    );

    expect(response?.followUps).toEqual(['Masih lapar setelah 10 menit?']);
    expect(response?.message).toBe('Coba mulai dari satu gelas air.');
    const requestBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(requestBody.contents.some((item: { role?: string }) => item.role === 'model')).toBe(true);
    expect(requestBody.contents[0].parts[0].text).toContain('recentMeals');
  });

  test('structured coach derives food-decision copy and action locally', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                message: 'Langsung makan besar saja.',
                followUps: ['Mau tambah dessert juga?'],
                recommendedAction: 'meal',
                safetyNote: '',
              }),
            }],
          },
        }],
      }),
    } as any);

    const response = await sendStructuredAICoachChatQuery(
      'Bolehkah aku makan sekarang?',
      'Budi',
      {
        ...mockUserContext,
        caloriesIn: 1900,
        targetCalories: 1800,
        remainingCalories: -100,
        lastHungerCheck: {
          answer: 'hungry',
          signal: 'physical',
          intent: 'meal',
          decisionKind: 'meal',
        },
      },
      'valid_key'
    );

    expect(response?.recommendedAction).toBe('water');
    expect(response?.message).toContain('Mulai dengan satu gelas air.');
    expect(response?.message).toContain('masih lapar secara fisik');
    expect(response?.message).not.toContain('Langsung makan besar');
    expect(response?.followUps).toEqual(['Masih lapar setelah jeda 10 menit?']);
  });

  test('structured coach does not add water after hydration target is met', async () => {
    const response = await sendStructuredAICoachChatQuery(
      'Apakah saya perlu minum lagi?',
      'Budi',
      {
        ...mockUserContext,
        waterGlasses: 9,
      },
      'valid_key'
    );

    expect(response?.recommendedAction).toBe('none');
    expect(response?.message).toContain('sudah terpenuhi');
    expect(response?.message).toContain('jika memang haus');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('structured coach keeps Gemini useful for a non-decision nutrition question', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                message: 'Tempe memberi protein dan serat dalam satu lauk.',
                followUps: ['Mau ide olahan tempe?'],
                recommendedAction: 'none',
                safetyNote: '',
              }),
            }],
          },
        }],
      }),
    } as any);

    const response = await sendStructuredAICoachChatQuery(
      'Apa kandungan utama tempe?',
      'Budi',
      mockUserContext,
      'valid_key'
    );

    expect(response).toMatchObject({
      message: 'Tempe memberi protein dan serat dalam satu lauk.',
      followUps: ['Mau ide olahan tempe?'],
      recommendedAction: 'none',
    });
  });

  test('generateWeeklyInsight returns only structured, user-data-backed copy', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                headline: 'Protein mulai konsisten',
                body: 'Rata-rata protein mendekati target pada hari yang dicatat.',
                nextExperiment: 'Tambahkan satu sumber protein saat sarapan.',
              }),
            }],
          },
        }],
      }),
    } as any);

    const insight = await generateWeeklyInsight(
      {
        habitScore: 70,
        avgDailyCalories: 1650,
        targetCalories: 1800,
        proteinCompliancePct: 82,
        todayWaterCompliancePct: 75,
        daysWithMealData: 5,
        snackCount: 3,
        topSnackTrigger: 'Bosan',
      },
      'valid_key'
    );

    expect(insight?.headline).toBe('Protein mulai konsisten');
    expect(insight?.source).toBe('gemini');
  });
});
