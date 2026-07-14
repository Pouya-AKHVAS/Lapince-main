import type { Transaction } from "../types/transaction";

const API_URL = `${import.meta.env.VITE_API_BASE_URL}/transactions`;

export type { Transaction };

export interface TransactionPayload {
  amount: number;
  date: string;
  description: string;
  categoryId: number;
}

export interface PaginatedTransactions {
  data: Transaction[];
  total: number;
  page: number;
  totalPages: number;
}

// GET transactions - toutes les transactions de l'utilisateur connecté
export async function fetchTransactions(
  page = 1,
  limit = 20,
): Promise<PaginatedTransactions> {
  const response = await fetch(`${API_URL}?page=${page}&limit=${limit}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(
      `Erreur ${response.status} : Impossible de récupérer les transactions`,
    );
  }
  return response.json();
}

// POST transactions - créer une transactions

export async function createTransaction(
  data: TransactionPayload,
): Promise<Transaction> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(
      `Erreur ${response.status} : Impossible de créer la transaction.`,
    );
  }
  const transaction = await response.json();
  window.dispatchEvent(new CustomEvent("transaction:created"));
  return transaction;
}

// DELETE transactions - supprimer une transaction
export async function deleteTransactionApi(id: number) {
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/transactions/${id}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );
  if (!res.ok) throw new Error("Delete failed");

  // Déclencher l'événement pour notifier le système d'alertes du recalcul
  window.dispatchEvent(new CustomEvent("transaction:created"));
}

// PATCH/PUT transactions - modifier une transaction
export async function updateTransactionApi(t: Transaction) {
  const payload = {
    amount: Number(t.amount), // Assurer le type Number
    description: t.description,
    date: t.date,
    categoryId: t.category.id,
  };

  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/transactions/${t.id}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    throw new Error("Erreur API");
  }

  const updatedTransaction = await res.json();

  // Déclencher l'événement pour mettre à jour le montant de l'alerte en temps réel
  window.dispatchEvent(new CustomEvent("transaction:created"));

  return updatedTransaction;
}
