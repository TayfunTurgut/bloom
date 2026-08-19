import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tayfunturgut.sprout",
  appName: "Sprout",
  webDir: "dist",
  ios: {
    contentInset: "never",
    backgroundColor: "#000000",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#000000",
    },
  },
};

export default config;
