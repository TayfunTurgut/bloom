import { Application } from "pixi.js";

async function main() {
  const app = new Application();

  await app.init({
    background: "#1099bb",
    resizeTo: window,
  });

  const pixiContainer = document.getElementById("pixi-container");
  if (!pixiContainer) {
    throw new Error("PixiContainer not found");
  }

  pixiContainer.appendChild(app.canvas);
}

void main();
