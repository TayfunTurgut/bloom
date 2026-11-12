import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tayfunturgut.sprout",
  appName: "Sprout",
  webDir: "dist",
  ios: {
    contentInset: "never",
    backgroundColor: "#d0eb9d",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#d0eb9d",
    },
  },
};

export default config;
