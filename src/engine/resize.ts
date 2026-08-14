import type { Application, Container } from "pixi.js";

export const onResize = (
  app: Application,
  callback: (w: number, h: number) => void,
  container: Container,
  immediate = true,
) => {
  app.renderer.on("resize", callback, container);
  container.once("destroyed", () => {
    app.renderer.off("resize", callback, container);
  });
  if (immediate) {
    callback.call(container, app.screen.width, app.screen.height);
  }
};
