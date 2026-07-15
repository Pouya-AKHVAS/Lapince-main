import type { Category } from "../types/category";
import { apiFetch } from "./apiFetch";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/categories`;

/**
 * Récupère toutes les catégories — GET /categories
 */
export async function fetchCategories(): Promise<Category[]> {
  const response = await apiFetch(API_URL, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Erreur ${response.status} : Impossible de récupérer les catégories.`);
  }

  return response.json();
}

/**
 * Récupère une catégorie spécifique par son ID — GET /categories/:id
 */
export async function fetchCategoryById(id: number): Promise<Category> {
  const response = await apiFetch(`${API_URL}/${id}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Erreur ${response.status} : Catégorie ${id} introuvable.`);
  }

  return response.json();
}