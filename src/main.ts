import { CGameController } from "./game/controller";
import "./style.css";

function main() {
  const controller = new CGameController();
  void controller.init();
}

main();
