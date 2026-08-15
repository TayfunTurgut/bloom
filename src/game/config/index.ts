import { configSchema, type TConfigInput } from "./schema";

const aspectRatio = 9 / 16;
const width = 720;

type TCellInput = TConfigInput["levels"][number]["data"][number];

/** A carrot under a one-hit vine: one placement beside it tears it open. */
const VINED: TCellInput = {
  piece: "carrot/happy",
  layers: [{ kind: "VINE" }],
};

/** Three hits, so it thins through all three stages of vine art before it
 *  gives — the case that shows a cover is not just on or off. */
const THICK_VINED: TCellInput = {
  piece: "broccoli/happy",
  layers: [{ kind: "VINE", hits: 3 }],
};

/** Stone erodes on MOVE_ENDED rather than on adjacency, so it comes off on a
 *  timer wherever the player is playing. */
const STONED: TCellInput = {
  piece: "cherry/happy",
  layers: [{ kind: "STONE", hits: 2 }],
};

const config: TConfigInput = {
  width,
  height: width / aspectRatio, // 1280
  levels: [
    {
      // A cell with `piece` and `layers` starts as a vegetable buried under
      // covers: a vine opens up as the player plays beside it, a stone slab
      // erodes a move at a time wherever they play. Neither flower counts
      // toward a goal or a drain until it is uncovered.
      // prettier-ignore
      data: [
        {}, {}, {}, {}, {},
        {}, VINED, {}, STONED, {},
        {}, {}, {}, {}, {},
        {}, THICK_VINED, {}, {}, {},
        {}, {}, {}, {}, {},
      ],
      columns: 5,
      goals: [{ type: "apple_half/happy", count: 9 }],
      pieces: [
        "apple_half/happy",
        "carrot/happy",
        "cherry/happy",
        "broccoli/happy",
        "grapes/happy",
      ],
    },
  ],
};

export default configSchema.parse(config);
