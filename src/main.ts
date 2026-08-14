import { CGameController } from "./controllers/game";
import "./style.css";
import "@pixi/layout";

function main() {
  const controller = new CGameController();
  void controller.init();
}

main();
