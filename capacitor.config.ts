import type { CapacitorConfig } from '@capacitor/cli';

// Bundled web assets, not a remote WebView wrapper.
// Network APIs must use an HTTPS backend configured at build time.
const config: CapacitorConfig = {
  appId: 'com.reeltara.app',
  appName: 'ReelTara',
  webDir: 'dist',
  android: { allowMixedContent: false },
};
export default config;
