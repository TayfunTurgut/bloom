import { configSchema, type TConfigInput } from "./schema";

const aspectRatio = 9 / 16;
const width = 720;

type TCellInput = TConfigInput["levels"][number]["data"][number];

const HOLE: TCellInput = { type: "EMPTY" };
const CARROT_6: TCellInput = { piece: "carrot_happy", value: 6 };
const WATERMELON_11: TCellInput = {
  piece: "watermelon_slice_happy",
  value: 11,
};
const PEACH_9: TCellInput = { piece: "peach_happy", value: 9 };

const config: TConfigInput = {
  width,
  height: width / aspectRatio,
  levels: [
    {
      // prettier-ignore
      data: [
        {}, {}, {}, {},
        {}, {}, {}, {},
        {}, {}, {}, {},
        {}, {}, {}, {},
      ],
      columns: 4,
      goals: [{ type: "apple_happy", count: 3 }],
      pieces: ["apple_happy", "carrot_happy", "cherry_happy"],
    },
    {
      // prettier-ignore
      data: [
        {}, {}, {}, {}, {},
        {}, {}, {}, {}, {},
        {}, {}, CARROT_6, {}, {},
        {}, {}, {}, {}, {},
        {}, {}, {}, {}, {},
      ],
      columns: 5,
      goals: [
        { type: "carrot_happy", count: 3 },
        { type: "grapes_happy", count: 2 },
      ],
      pieces: ["apple_happy", "carrot_happy", "cherry_happy", "grapes_happy"],
    },
    {
      // prettier-ignore
      data: [
        HOLE, {}, {}, {}, HOLE,
        {}, {}, {}, {}, {},
        {}, {}, {}, {}, {},
        {}, {}, {}, {}, {},
        HOLE, {}, {}, {}, HOLE,
      ],
      columns: 5,
      goals: [
        { type: "tomato_happy", count: 4 },
        { type: "orange_happy", count: 3 },
      ],
      pieces: [
        "tomato_happy",
        "orange_happy",
        "strawberry_happy",
        "broccoli_happy",
      ],
    },
    {
      // prettier-ignore
      data: [
        {}, {}, HOLE, HOLE, {}, {},
        {}, {}, {}, {}, {}, {},
        {}, WATERMELON_11, {}, {}, PEACH_9, {},
        {}, {}, {}, {}, {}, {},
        {}, {}, HOLE, HOLE, {}, {},
      ],
      columns: 6,
      goals: [
        { type: "watermelon_slice_happy", count: 3 },
        { type: "pineapple_slice_happy", count: 3 },
        { type: "peach_happy", count: 2 },
      ],
      pieces: [
        "apple_happy",
        "grapes_happy",
        "watermelon_slice_happy",
        "pineapple_slice_happy",
        "peach_happy",
      ],
    },
    {
      // prettier-ignore
      data: [
        {}, {}, {}, {}, {}, {},
        {}, HOLE, {}, {}, HOLE, {},
        {}, {}, {}, {}, {}, {},
        {}, {}, {}, {}, {}, {},
        {}, HOLE, {}, {}, HOLE, {},
        {}, {}, {}, {}, {}, {},
      ],
      columns: 6,
      goals: [
        { type: "carrot_happy", count: 4 },
        { type: "corn_happy", count: 3 },
        { type: "eggplant_happy", count: 3 },
        { type: "pumpkin_happy", count: 2 },
      ],
      pieces: [
        "carrot_happy",
        "corn_happy",
        "eggplant_happy",
        "pumpkin_happy",
        "radish_happy",
        "blueberry_happy",
      ],
    },
  ],
};

export default configSchema.parse(config);
