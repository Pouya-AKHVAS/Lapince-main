import type { Overview, MonthlyEntry } from "../types/stats";
import { apiFetch } from "./apiFetch";
const BASE = `${import.meta.env.VITE_API_BASE_URL}/stats`;

export async function fetchOverview(): Promise<Overview> {
  const res = await apiFetch(`${BASE}/overview`, {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Erreur ${res.status} (overview)`);
  return res.json();
}

export async function fetchMonthlyStats(): Promise<MonthlyEntry[]> {
  const res = await apiFetch(`${BASE}/monthly`, {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Erreur ${res.status} (monthly)`);
  return res.json();
}
