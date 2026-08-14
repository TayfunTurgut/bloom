import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tayfunturgut.bloom",
  appName: "Bloom",
  webDir: "dist",
  ios: {
    contentInset: "never", // paint edge-to-edge; safe areas handled in CSS
    backgroundColor: "#000000",
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false, // hidden from code once the scene is ready
      backgroundColor: "#000000",
    },
  },
  // No `server.url` here, ever: store builds must bundle everything locally.
};

export default config;
