import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const GEMINI_API_KEY_ALIAS = 'habitdiet_gemini_api_key';
const OLD_USER_PROFILE_KEY = '@habitdiet_user_profile';

let inMemoryWebStore: Record<string, string> = {};

/**
 * Get Gemini API Key securely on Native (OS Keychain/Keystore) or Web (In-Memory/Session)
 */
export async function getGeminiApiKey(): Promise<string> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage.getItem(GEMINI_API_KEY_ALIAS) || inMemoryWebStore[GEMINI_API_KEY_ALIAS] || '';
      }
      return inMemoryWebStore[GEMINI_API_KEY_ALIAS] || '';
    }
    const key = await SecureStore.getItemAsync(GEMINI_API_KEY_ALIAS);
    return key || '';
  } catch (error) {
    console.error('Error reading Gemini API Key:', error);
    return '';
  }
}

/**
 * Save Gemini API Key securely on Native OS SecureStore or Web Session
 */
export async function saveGeminiApiKey(apiKey: string): Promise<void> {
  const cleanKey = apiKey.trim();
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        if (cleanKey) {
          window.sessionStorage.setItem(GEMINI_API_KEY_ALIAS, cleanKey);
        } else {
          window.sessionStorage.removeItem(GEMINI_API_KEY_ALIAS);
        }
      }
      inMemoryWebStore[GEMINI_API_KEY_ALIAS] = cleanKey;
      return;
    }

    if (cleanKey) {
      await SecureStore.setItemAsync(GEMINI_API_KEY_ALIAS, cleanKey);
    } else {
      await SecureStore.deleteItemAsync(GEMINI_API_KEY_ALIAS);
    }
  } catch (error) {
    console.error('Error saving Gemini API Key:', error);
  }
}

/**
 * Delete Gemini API Key from SecureStore or Web Session
 */
export async function deleteGeminiApiKey(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(GEMINI_API_KEY_ALIAS);
      }
      delete inMemoryWebStore[GEMINI_API_KEY_ALIAS];
      return;
    }
    await SecureStore.deleteItemAsync(GEMINI_API_KEY_ALIAS);
  } catch (error) {
    console.error('Error deleting Gemini API Key:', error);
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
