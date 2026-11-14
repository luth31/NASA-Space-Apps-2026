import {
  Sparkles,
  ScanLine,
  Clock3,
  Grid2X2,
  LayoutGrid,
  Boxes,
  Columns2,
  Newspaper,
  AudioLines,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Concept, Experiment } from "./report-data";
export interface ReportConcept {
  id: Experiment;
  name: string;
  type: string;
  description: string;
  strength: string;
  tradeoff: string;
  icon: LucideIcon;
  category: "story" | "pattern" | "play";
  accent: string;
}
export const concepts: ReportConcept[] = [
  {
    id: "story",
    name: "The Spark",
    type: "Guided discovery",
    description:
      "A glowing year. One spark to follow. Keep pulling the story closer.",
    strength: "One discovery leads naturally to the next.",
    tradeoff: "A guided path, with fewer comparisons at once.",
    icon: Sparkles,
    category: "story",
    accent: "#efbc87",
  },
  {
    id: "dashboard",
    name: "The Observatory",
    type: "Particle playground",
    description: "The same signals become columns, an orbit, and a river.",
    strength: "Morphing the same particles makes different patterns visible.",
    tradeoff: "You choose your own next question.",
    icon: ScanLine,
    category: "play",
    accent: "#b8cda4",
  },
  {
    id: "timeline",
    name: "Time Machine",
    type: "Scrub & replay",
    description:
      "Move a playhead through a year, then enter a month, a day, an hour.",
    strength: "Time becomes something you can scrub and replay.",
    tradeoff: "Time takes the lead; geography is secondary.",
    icon: Clock3,
    category: "play",
    accent: "#edc893",
  },
  {
    id: "mosaic",
    name: "Signal Mosaic",
    type: "Zoomable proportions",
    description:
      "A year becomes a wall of living tiles. The biggest moment takes the most space.",
    strength:
      "Area makes concentration immediately obvious; switch between time and place.",
    tradeoff: "Tiny shares need the exact-count list.",
    icon: Grid2X2,
    category: "pattern",
    accent: "#d9aaef",
  },
  {
    id: "tapestry",
    name: "The Fire Loom",
    type: "Patterns across years",
    description:
      "Weave months into a heat tapestry. Find a season, then open a single thread.",
    strength: "Repetition, gaps, and exceptional years appear together.",
    tradeoff: "Color supports pattern finding more than precise comparison.",
    icon: LayoutGrid,
    category: "pattern",
    accent: "#a8d7c8",
  },
  {
    id: "sculpture",
    name: "Data Landscape",
    type: "A 3D data sculpture",
    description:
      "Turn a year into a physical skyline. Drag to orbit, then step inside a tower.",
    strength: "A spatial, tactile introduction to the shape of a year.",
    tradeoff:
      "Perspective changes how heights appear; exact counts stay available.",
    icon: Boxes,
    category: "play",
    accent: "#b0c8f2",
  },
  {
    id: "split",
    name: "Two Ways of Seeing",
    type: "Satellite comparison",
    description:
      "Slide between two satellites. Discover why seeing more pixels doesn’t mean more fires.",
    strength: "A hands-on explanation of sensor differences.",
    tradeoff: "A focused lesson rather than a broad overview of every metric.",
    icon: Columns2,
    category: "pattern",
    accent: "#9bdbe4",
  },
  {
    id: "dispatch",
    name: "The Fire Dispatch",
    type: "An interactive magazine",
    description:
      "Big photographs, bold headlines, and pages you can turn. An editorial fire story.",
    strength:
      "A human, memorable presentation with a deliberately different reading rhythm.",
    tradeoff: "Pages hide some comparisons until you turn them.",
    icon: Newspaper,
    category: "story",
    accent: "#e7ceb0",
  },
  {
    id: "sequencer",
    name: "Signal Symphony",
    type: "Feel & hear the record",
    description:
      "Play a year as an instrument. Every pad is a period; every note comes from a count.",
    strength: "Rhythm and optional sound make changes tangible.",
    tradeoff:
      "An expressive data view; use the exact counts for precise comparisons.",
    icon: AudioLines,
    category: "play",
    accent: "#d3ee8e",
  },
];
export const ideaParts = [
  "Whole idea",
  "Visuals",
  "Layout",
  "Motion",
  "Storytelling",
] as const;
export type IdeaPart = (typeof ideaParts)[number];
export function parseConcept(value: string | null): Concept {
  return value === "gallery" || concepts.some((c) => c.id === value)
    ? (value as Concept)
    : "gallery";
}
