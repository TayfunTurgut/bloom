import type { AssetKey } from "../../assetpack/assets";

export type TSkin = {
  id: string;
  name: string;
  price: number;
  crops: readonly AssetKey[];
};

export const SKIN_SIZE = 15;

export const SKINS: readonly TSkin[] = [
  {
    id: "garden",
    name: "Garden",
    price: 0,
    crops: [
      "carrot_happy",
      "strawberry_happy",
      "corn_happy",
      "eggplant_happy",
      "broccoli_happy",
      "grapes_happy",
      "watermelon_slice_happy",
      "mushroom_happy",
      "pumpkin_happy",
      "lemon_happy",
      "blueberry_happy",
      "tomato_happy",
      "pineapple_slice_happy",
      "radish_happy",
      "banana_happy",
    ],
  },
  {
    id: "orchard",
    name: "Orchard",
    price: 150,
    crops: [
      "apple_happy",
      "pear_happy",
      "peach_happy",
      "cherry_happy",
      "plum_happy",
      "orange_happy",
      "banana_happy",
      "grapes_happy",
      "lemon_happy",
      "lime_happy",
      "raspberry_happy",
      "blackberry_happy",
      "kiwi_slice_happy",
      "coconut_happy",
      "pomegranate_happy",
    ],
  },
  {
    id: "roots",
    name: "Roots",
    price: 250,
    crops: [
      "carrot_happy",
      "radish_happy",
      "turnip_happy",
      "potato_happy",
      "yam_happy",
      "onion_happy",
      "garlic_happy",
      "leek_happy",
      "pepper_happy",
      "cabbage_happy",
      "cauliflower_happy",
      "corn_happy",
      "eggplant_happy",
      "pumpkin_happy",
      "mushroom_happy",
    ],
  },
];

export const DEFAULT_SKIN_ID = SKINS[0].id;

export const skinById = (id: string): TSkin =>
  SKINS.find((skin) => skin.id === id) ?? SKINS[0];
