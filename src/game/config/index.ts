import { configSchema, type TConfigInput } from "./schema";

const aspectRatio = 9 / 16;
const width = 720;

type TCellInput = TConfigInput["levels"][number]["data"][number];

const VINED: TCellInput = {
  piece: "carrot/happy",
  layers: [{ kind: "VINE" }],
};

const THICK_VINED: TCellInput = {
  piece: "broccoli/happy",
  layers: [{ kind: "VINE", hits: 3 }],
};

const STONED: TCellInput = {
  piece: "cherry/happy",
  layers: [{ kind: "STONE", hits: 2 }],
};

const config: TConfigInput = {
  width,
  height: width / aspectRatio,
  levels: [
    {
      // prettier-ignore
      data: [
        {}, {}, {}, {}, {},
        {}, VINED, {}, STONED, {},
        {}, {}, {}, {}, {},
        {}, THICK_VINED, {}, {}, {},
        {}, {}, {}, {}, {},
      ],
      columns: 5,
      goals: [{ type: "apple_idle", count: 9 }],
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
