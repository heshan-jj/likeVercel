import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.likevercel.app',
  appName: 'likeVercel',
  webDir: 'dist',
  server: {
    // Change this to your server's IP/domain when deploying
    // For development, comment this out to use a bundled build
    // url: 'http://YOUR_VPS_IP:3001',
    // allowNavigation: ['YOUR_VPS_IP'],
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#f8fafc',
  },
};

export default config;
