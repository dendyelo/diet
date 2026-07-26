import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const GEMINI_API_KEY_SECURE_ALIAS = 'habitdiet_gemini_api_key';
const OLD_USER_PROFILE_KEY = '@habitdiet_user_profile';

let inMemoryWebStore: Record<string, string> = {};

/**
 * Get Gemini API Key securely from OS SecureStore (with Web fallback)
 */
export async function getGeminiApiKey(): Promise<string> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(GEMINI_API_KEY_SECURE_ALIAS) || '';
      }
      return inMemoryWebStore[GEMINI_API_KEY_SECURE_ALIAS] || '';
    }
    const key = await SecureStore.getItemAsync(GEMINI_API_KEY_SECURE_ALIAS);
    return key || '';
  } catch (error) {
    console.error('Error reading Gemini API Key from SecureStore:', error);
    return '';
  }
}

/**
 * Save Gemini API Key securely to OS SecureStore
 */
export async function saveGeminiApiKey(apiKey: string): Promise<void> {
  const cleanKey = apiKey.trim();
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (cleanKey) {
          window.localStorage.setItem(GEMINI_API_KEY_SECURE_ALIAS, cleanKey);
        } else {
          window.localStorage.removeItem(GEMINI_API_KEY_SECURE_ALIAS);
        }
      } else {
        inMemoryWebStore[GEMINI_API_KEY_SECURE_ALIAS] = cleanKey;
      }
      return;
    }

    if (cleanKey) {
      await SecureStore.setItemAsync(GEMINI_API_KEY_SECURE_ALIAS, cleanKey);
    } else {
      await SecureStore.deleteItemAsync(GEMINI_API_KEY_SECURE_ALIAS);
    }
  } catch (error) {
    console.error('Error saving Gemini API Key to SecureStore:', error);
  }
}

/**
 * Delete Gemini API Key from SecureStore
 */
export async function deleteGeminiApiKey(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(GEMINI_API_KEY_SECURE_ALIAS);
      }
      delete inMemoryWebStore[GEMINI_API_KEY_SECURE_ALIAS];
      return;
    }
    await SecureStore.deleteItemAsync(GEMINI_API_KEY_SECURE_ALIAS);
  } catch (error) {
    console.error('Error deleting Gemini API Key from SecureStore:', error);
  }
}

/**
 * Auto-migration: Migrate legacy Gemini API Key from AsyncStorage to SecureStore, then strip it from AsyncStorage
 */
export async function migrateApiKeyFromAsyncStorage(): Promise<string> {
  try {
    const existingSecureKey = await getGeminiApiKey();
    if (existingSecureKey && existingSecureKey.trim().length > 0) {
      return existingSecureKey;
    }

    const legacyProfileData = await AsyncStorage.getItem(OLD_USER_PROFILE_KEY);
    if (legacyProfileData) {
      const parsed = JSON.parse(legacyProfileData);
      if (parsed.geminiApiKey && typeof parsed.geminiApiKey === 'string' && parsed.geminiApiKey.trim().length > 0) {
        const legacyKey = parsed.geminiApiKey.trim();
        await saveGeminiApiKey(legacyKey);

        // Strip geminiApiKey from AsyncStorage profile to maintain security
        delete parsed.geminiApiKey;
        await AsyncStorage.setItem(OLD_USER_PROFILE_KEY, JSON.stringify(parsed));
        console.log('Successfully migrated Gemini API Key to SecureStore and cleaned AsyncStorage.');
        return legacyKey;
      }
    }
  } catch (error) {
    console.error('Error migrating API Key from AsyncStorage:', error);
  }
  return '';
}
