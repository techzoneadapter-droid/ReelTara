import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export function registerNativeBack(onBack: () => void): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};
  const handle = NativeApp.addListener('backButton', onBack);
  return () => { void handle.then(listener => listener.remove()); };
}
export function minimizeNativeApp() { void NativeApp.minimizeApp(); }
