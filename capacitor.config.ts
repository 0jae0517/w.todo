import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // Play Store package name; it can't change after the first release
  appId: 'com.wtodo.app',
  appName: 'w.todo',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_wtodo',
      iconColor: '#4f7cff',
    },
  },
}

export default config
