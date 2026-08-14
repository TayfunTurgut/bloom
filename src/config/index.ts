import { configSchema, type TConfigInput } from "./schema";

const aspectRatio = 9 / 16;
const width = 720;

const config: TConfigInput = {
  width,
  height: width / aspectRatio, // 1280
  levels: [
    {
      // prettier-ignore
      data: [
        {}, {}, {}, {}, {},
        {}, {}, {}, {}, {},
        {}, {}, {}, {}, {},
        {}, {}, {}, {}, {},
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
