"use client";

import { useEffect, useState } from "react";
import type { RollEntry, UserDataGroup, UserDataTable } from "../types";
import { parseJsonOrThrow } from "../api";

interface UserDataTabProps {
  loading: boolean;
  setLoading: (v: boolean) => void;
  setError: (v: string | null) => void;
  addHistoryEntry: (entry: RollEntry) => void;
}

function dieSides(die: string): number {
  const match = die.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 6;
}

function rollTable(table: UserDataTable): { pieces: string[]; rolls: number[] } {
  const sides = dieSides(table.die);
  const rolls: number[] = [];
  const pieces: string[] = [];
  for (let i = 0; i < table.die_rolls; i++) {
    const value = Math.floor(Math.random() * sides) + 1;
    rolls.push(value);
    const row = table.rolls.find((r) => r.roll === value);
    pieces.push(row?.result[i] ?? "");
  }
  return { pieces, rolls };
}

export default function UserDataTab({ loading, setLoading, setError, addHistoryEntry }: UserDataTabProps) {
  const [groups, setGroups] = useState<UserDataGroup[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/user-data");
        const data = await parseJsonOrThrow(res);
        if (!res.ok) throw new Error(data.error ?? "Failed to load user data");
        if (!cancelled) setGroups(data.groups ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [setLoading, setError]);

  function handleRoll(group: UserDataGroup, table: UserDataTable) {
    const { pieces, rolls } = rollTable(table);
    addHistoryEntry({
      id: Date.now(),
      label: table.table,
      notation: table.table,
      rolls,
      rawSum: 0,
      modifier: 0,
      total: 0,
      timestamp: new Date().toLocaleTimeString(),
      isUserData: true,
      userDataHeading: group.heading,
      userDataResult: pieces.join(""),
    });
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
      {loading && groups.length === 0 && (
        <p className="text-xs text-gray-500 uppercase tracking-widest">Loading...</p>
      )}

      {!loading && groups.length === 0 && (
        <p className="text-xs text-gray-500 uppercase tracking-widest">No user data found</p>
      )}

      {groups.map((group, gi) => (
        <div key={gi} className="flex flex-col gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-widest">{group.heading}</span>
          <div className="border border-gray-800 rounded-lg p-4 flex flex-col gap-2">
            {group.tables.map((table, ti) => (
              <button
                key={ti}
                onClick={() => handleRoll(group, table)}
                className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold uppercase tracking-widest transition-colors text-sm"
              >
                {table.table}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
