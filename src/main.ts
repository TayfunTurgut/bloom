import { CGameController } from "./controllers/game";
import "./style.css";

function main() {
  const controller = new CGameController();
  void controller.init();
}

main();
