import * as SecureStore from "expo-secure-store";

const memoryFallback: Record<string, string> = {};

export async function saveStorageItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    memoryFallback[key] = value;
  }
}

export async function getStorageItem(key: string): Promise<string | null> {
  try {
    const val = await SecureStore.getItemAsync(key);
    if (val !== null) return val;
    return memoryFallback[key] || null;
  } catch {
    return memoryFallback[key] || null;
  }
}

export async function removeStorageItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    delete memoryFallback[key];
  }
}
