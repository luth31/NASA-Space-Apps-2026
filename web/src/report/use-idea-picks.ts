import { useEffect, useState } from "react";
import { concepts, ideaParts } from "./concepts";
import type { IdeaPart } from "./concepts";
import type { Experiment } from "./report-data";
const key = "pyrobridge-report-ideas-v1";
export interface IdeaPick {
  parts: IdeaPart[];
  note: string;
}
export type IdeaPicks = Partial<Record<Experiment, IdeaPick>>;
export function readPicks(raw: string | null): IdeaPicks {
  try {
    const input = JSON.parse(raw ?? "{}");
    const result: IdeaPicks = {};
    for (const c of concepts) {
      const value = input?.[c.id];
      if (!value || typeof value !== "object") continue;
      const parts = Array.isArray(value.parts)
        ? ideaParts.filter((p) => value.parts.includes(p))
        : [];
      const note =
        typeof value.note === "string" ? value.note.slice(0, 2000) : "";
      if (parts.length || note) result[c.id] = { parts: [...parts], note };
    }
    return result;
  } catch {
    return {};
  }
}
export function useIdeaPicks() {
  const [picks, setPicks] = useState<IdeaPicks>(() => {
    try {
      return readPicks(localStorage.getItem(key));
    } catch {
      return {};
    }
  });
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(picks));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [picks]);
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === key) setPicks(readPicks(e.newValue));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function toggle(id: Experiment, part: IdeaPart) {
    setPicks((old) => {
      const pick = old[id] ?? { parts: [], note: "" };
      const parts = pick.parts.includes(part)
        ? pick.parts.filter((p) => p !== part)
        : [...pick.parts, part];
      const next = { ...old };
      if (parts.length || pick.note) next[id] = { ...pick, parts };
      else delete next[id];
      return next;
    });
  }
  function note(id: Experiment, value: string) {
    setPicks((old) => ({
      ...old,
      [id]: { parts: old[id]?.parts ?? [], note: value.slice(0, 2000) },
    }));
  }
  return {
    picks,
    saved,
    toggle,
    note,
    count: concepts.filter(
      (c) => picks[c.id]?.parts.length || picks[c.id]?.note,
    ).length,
  };
}
export type PicksModel = ReturnType<typeof useIdeaPicks>;
