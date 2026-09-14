import type { QuestDefinition } from "./quest.types";

/**
 * MVP katalog Daily Quest sablona. Namerno generican (nije vezan za
 * konkretne exercise ID-jeve iz data/exercises/*.json) da bi ostao
 * nezavisan od exercise library-ja dok se ne poveze Workout Engine
 * (Faza 5+). Menjati/prosirivati SAMO ovde.
 */
export const QUEST_DEFINITIONS: readonly QuestDefinition[] = [
  {
    id: "complete-todays-training",
    title: "Complete Today's Training",
    description: "Finish any workout session today.",
    targetValue: 1,
    unit: "workouts",
    reward: { xp: 150 },
  },
  {
    id: "pushup-50",
    title: "50 Push-Ups",
    description: "Complete 50 push-ups today (any push-up variation, across sets).",
    targetValue: 50,
    unit: "reps",
    reward: { xp: 80 },
  },
  {
    id: "squat-75",
    title: "75 Squats",
    description: "Complete 75 bodyweight squats today.",
    targetValue: 75,
    unit: "reps",
    reward: { xp: 80 },
  },
  {
    id: "plank-hold-3min",
    title: "3 Minutes of Plank",
    description: "Accumulate 3 total minutes in a plank hold today.",
    targetValue: 180,
    unit: "seconds",
    reward: { xp: 70 },
  },
  {
    id: "training-time-30",
    title: "30-Minute Training Session",
    description: "Spend at least 30 minutes training today.",
    targetValue: 30,
    unit: "minutes",
    reward: { xp: 120 },
  },
  {
    id: "two-workouts",
    title: "Double Session",
    description: "Complete 2 separate workout sessions today.",
    targetValue: 2,
    unit: "workouts",
    reward: { xp: 200 },
  },
];

export function findQuestDefinition(definitionId: string): QuestDefinition | undefined {
  return QUEST_DEFINITIONS.find((d) => d.id === definitionId);
}
