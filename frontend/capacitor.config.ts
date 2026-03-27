import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.likevercel.app',
  appName: 'likeVercel',
  webDir: 'dist',
  server: {
    androidScheme: 'http', 
    cleartext: true
  }
};

export default config;
