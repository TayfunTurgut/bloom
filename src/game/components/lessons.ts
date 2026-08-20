import type { AssetKey } from "../../assetpack/assets";
import type { TEffect, TMoveReport } from "../model/types";

export type TLessonId = "welcome" | "feed" | "swap" | "goals";

export type TBodyPart = string | { icon: AssetKey };
export type TBodyLine = readonly TBodyPart[];

type TTrigger =
  | { on: "level-start"; level: number }
  | { on: "move-end"; level?: number; effect: TEffect["type"] };

export type TLesson = {
  id: TLessonId;
  title: string;
  body: string | readonly TBodyLine[];
  trigger: TTrigger;
};

export type TLessonMoment =
  | { kind: "level-start"; level: number }
  | { kind: "move-end"; level: number; report: TMoveReport };

export const LESSONS: readonly TLesson[] = [
  {
    id: "welcome",
    title: "Welcome!",
    body: "Tap an empty tile to plant a crop. A crop with no neighbours starts growing.",
    trigger: { on: "level-start", level: 0 },
  },
  {
    id: "feed",
    title: "Feed & harvest",
    body: "Plant next to a growing crop to feed it. Feed it down to zero to harvest it!",
    trigger: { on: "move-end", level: 0, effect: "SPROUTED" },
  },
  {
    id: "swap",
    title: "Swap crops",
    body: [
      ["Tap the ", { icon: "btn-refresh" }, " button"],
      ["to swap the last"],
      ["two crops in the tray."],
    ],
    trigger: { on: "move-end", effect: "FED" },
  },
  {
    id: "goals",
    title: "Reach the goals",
    body: "Harvest the crops shown up top before the board fills. Take your time and enjoy.",
    trigger: { on: "level-start", level: 1 },
  },
];

export const nextLesson = (
  moment: TLessonMoment,
  seen: readonly string[],
): TLesson | null =>
  LESSONS.find(
    (lesson) => !seen.includes(lesson.id) && matches(lesson.trigger, moment),
  ) ?? null;

const matches = (trigger: TTrigger, moment: TLessonMoment): boolean => {
  if (trigger.on === "level-start")
    return moment.kind === "level-start" && moment.level === trigger.level;
  return (
    moment.kind === "move-end" &&
    (trigger.level === undefined || moment.level === trigger.level) &&
    moment.report.effects.some((effect) => effect.type === trigger.effect)
  );
};
