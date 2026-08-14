import { Application, type ApplicationOptions } from "pixi.js";
import { CContainer } from "./container";

export abstract class CBaseController extends CContainer {
  app = new Application();

  abstract init(options?: Partial<ApplicationOptions>): Promise<Application>;

  protected addContainerToStage() {
    this.app.stage.addChild(this.container);
  }
}
