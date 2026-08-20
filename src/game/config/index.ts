import { configSchema, type TConfigInput } from "./schema";

const aspectRatio = 9 / 16;
const width = 720;

const config: TConfigInput = {
  width,
  height: width / aspectRatio,
};

export default configSchema.parse(config);
