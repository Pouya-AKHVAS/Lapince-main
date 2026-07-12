import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import * as transactionService from "../services/transaction.service.ts"; // On importe les fonctions du service de transaction pour les utiliser dans les contrôleurs. Cela permet de séparer la logique métier (dans le service) de la gestion des requêtes/réponses (dans le contrôleur), ce qui rend le code plus propre et plus facile à maintenir.
import { generateBudgetAlert } from "../services/alert.generator.js";

import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionQuerySchema,
} from "../validators/transaction.validator.js"; // Import des schémas de validation Zod pour les transactions. Ces schémas permettent de valider les données entrantes (body, query params) de manière structurée et de fournir des messages d'erreur clairs en cas de données invalides.

// --- 1. GET /transactions ---
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // On rassure TypeScript : si pas de user, on bloque.
    if (!req.user) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }
    
    // Validation des filtres (query params) via le schéma de requêtes Zod
    const filters = transactionQuerySchema.safeParse(req.query || {});
    if (!filters.success) {
      return res.status(400).json({ erreurs: filters.error.format() });
    }

    // Appel au service métier (req.user est injecté par le middleware d'auth)
    const transactions = await transactionService.getAllTransactions(
      req.user.id,
      filters.data,
    );

    return res.status(200).json(transactions);
  } catch (error) {
    // Redirection de l'exception vers le Global Error Handler centralisé
    next(error);
  }
};

// --- 2. POST /transactions ---
export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // On rassure TypeScript : si pas de user, on bloque.
    if (!req.user) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }
    
    // Validation stricte du body avec Zod avant traitement
    const body = createTransactionSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ erreurs: body.error.format() });
    }

    // Appel au service pour la création de l'enregistrement en base de données
    const transaction = await transactionService.createTransaction(
      req.user.id,
      body.data,
    );

    // -------------------------------------------------------------
    // Générer une alerte si le budget est dépassé
    // (Appel au générateur d'alertes, logique métier séparée)
    // -------------------------------------------------------------
    const budget = await prisma.budget.findFirst({
      where: { userId: req.user.id, categoryId: transaction.categoryId },
    });
    if (budget) {
      await generateBudgetAlert(budget.id, req.user.id);
    }

    return res.status(201).json(transaction);
  } catch (error: any) {
    // Si le service lève une erreur métier spécifique, on la traite de manière ciblée
    if (
      error.message === "Catégorie introuvable" ||
      error.message === "Action non autorisée sur cette catégorie"
    ) {
      return res.status(403).json({ message: error.message });
    }
    // Toutes les autres erreurs techniques ou imprévues sont envoyées au middleware centralisé
    next(error);
  }
};

// --- 3. GET /transactions/:id ---
export const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id as string, 10); // On parse l'ID depuis les paramètres de l'URL. parseInt peut retourner NaN si l'ID n'est pas un nombre valide, d'où la vérification suivante.
    if (isNaN(id)) return res.status(400).json({ message: "ID invalide" });

    // On rassure TypeScript : si pas de user, on bloque.
    if (!req.user) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    // Sollicitation de la couche service avec cloisonnement par l'ID utilisateur
    const transaction = await transactionService.getTransactionById(
      id,
      req.user.id,
    );
    if (!transaction)
      return res.status(404).json({ message: "Transaction introuvable" });

    return res.status(200).json(transaction);
  } catch (error) {
    next(error);
  }
};


// --- 4. PATCH /transactions/:id ---
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sécurité : Vérification de l'authentification de l'utilisateur via le middleware JWT
    if (!req.user) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    // Extraction et validation de l'identifiant de la transaction passé en paramètre
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID invalide" });
    }

    // Validation stricte de la payload partielle envoyée par le client avec Zod
    const body = updateTransactionSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ erreurs: body.error.format() });
    }

    // Récupération de l'état initial de la transaction AVANT modification (crucial pour les alertes)
    const oldTransaction = await transactionService.getTransactionById(
      id,
      req.user.id,
    );
    if (!oldTransaction) {
      return res
        .status(404)
        .json({ message: "Transaction introuvable ou non autorisée" });
    }

    // Application effective des modifications au sein de la couche service métier
    const updatedTransaction = await transactionService.updateTransaction(
      id,
      req.user.id,
      body.data,
    );

    if (!updatedTransaction) {
      return res.status(404).json({ message: "Transaction introuvable ou non autorisée" });
    }

    // -------------------------------------------------------------------------
    // GESTION DYNAMIQUE DES ALERTES BUDGÉTAIRES APRÈS MODIFICATION
    // -------------------------------------------------------------------------

    // 1. Recalcul et mise à jour de l'ANCIENNE catégorie (au cas où le montant a diminué ou migré)
    const oldBudget = await prisma.budget.findFirst({
      where: {
        userId: req.user.id,
        categoryId: oldTransaction.categoryId,
      },
    });
    if (oldBudget) {
      await generateBudgetAlert(oldBudget.id, req.user.id);
    }

    // 2. Recalcul et mise à jour de la NOUVELLE catégorie (si différente de l'ancienne)
    if (updatedTransaction.categoryId !== oldTransaction.categoryId) {
      const newBudget = await prisma.budget.findFirst({
        where: {
          userId: req.user.id,
          categoryId: updatedTransaction.categoryId,
        },
      });
      if (newBudget) {
        await generateBudgetAlert(newBudget.id, req.user.id);
      }
    }

    // Renvoi de l'entité mise à jour au client avec un code HTTP 200 (OK)
    return res.status(200).json(updatedTransaction);
  } catch (error) {
    // Centralisation de la gestion des erreurs techniques via le Global Error Handler
    next(error);
  }
};



// --- 5. DELETE /transactions/:id ---
export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sécurité : Vérification stricte de la session utilisateur via le middleware d'authentification
    if (!req.user) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    // Récupération et conversion de l'identifiant technique de la transaction
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID invalide" });
    }

    // Vérification de sécurité passive : validation de l'existence et contrôle d'accès (cloisonnement utilisateur)
    const existingTransaction = await transactionService.getTransactionById(
      id,
      req.user.id,
    );
    if (!existingTransaction) {
      return res
        .status(404)
        .json({ message: "Transaction introuvable ou non autorisée" });
    }

    // Identification de l'enveloppe budgétaire liée à cette transaction AVANT sa suppression
    const budget = await prisma.budget.findFirst({
      where: {
        userId: req.user.id,
        categoryId: existingTransaction.categoryId,
      },
    });

    // Suppression définitive de l'enregistrement déléguée à la couche service métier
    await transactionService.deleteTransaction(id, req.user.id);

    // -------------------------------------------------------------------------
    // ACTUALISATION DU STATUT DES ALERTES APRÈS SUPPRESSION
    // -------------------------------------------------------------------------
    // Si un budget existe pour cette catégorie, on recalcule immédiatement les seuils
    // car le montant total des dépenses vient de diminuer.
    if (budget) {
      await generateBudgetAlert(budget.id, req.user.id);
    }

    // Retour standard HTTP 204 (No Content) pour notifier le succès de l'opération au frontend
    return res.status(204).send();
  } catch (error) {
    // Transmission transparente de l'exception technique au gestionnaire global d'erreurs
    next(error);
  }
};