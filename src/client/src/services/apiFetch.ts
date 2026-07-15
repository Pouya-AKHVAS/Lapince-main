import { refreshSession } from "./authApi.ts";

// Empêche plusieurs requêtes simultanées de déclencher chacune leur propre refresh
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

/**
 * Wrapper autour de fetch() : si la requête échoue avec un 401 (access token expiré),
 * tente un refresh unique du token via le refreshToken (cookie httpOnly), puis rejoue
 * la requête originale une seule fois. Si le refresh échoue aussi, on renvoie la
 * réponse 401 d'origine (session réellement expirée → l'utilisateur doit se reconnecter).
 */
export async function apiFetch(
  input: RequestInfo,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, { ...init, credentials: "include" });

  if (response.status !== 401) {
    return response;
  }

  if (!isRefreshing) {
    isRefreshing = true;
    refreshPromise = refreshSession().finally(() => {
      isRefreshing = false;
    });
  }

  try {
    await refreshPromise;
  } catch {
    return response; // refresh échoué → on garde le 401 d'origine
  }

  return fetch(input, { ...init, credentials: "include" });
}