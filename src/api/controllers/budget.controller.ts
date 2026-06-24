import type { Request, Response, NextFunction } from "express";
import * as budgetService from "../services/budget.service.ts";
import { createBudgetSchema, updateBudgetSchema } from "../validators/budget.validator.js";

/**
 * --- 1. GET /budgets ---
 * Récupérer l'intégralité des budgets associés à l'utilisateur connecté.
 * Les exceptions sont capturées et centralisées via le gestionnaire global d'erreurs.
 */
export const getBudgets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Vérification de sécurité pour s'assurer que l'utilisateur est bien authentifié via le middleware JWT
    if (!req.user) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    // Délégation de la récupération des données à la couche de service dédiée
    const budgets = await budgetService.getAllBudgets(req.user.id);

    // Retour des informations avec le code statut HTTP 200 (OK)
    return res.status(200).json(budgets);
  } catch (error) {
    // Transmission transparente de l'exception au Global Error Handler
    next(error);
  }
};

/**
 * --- 2. POST /budgets ---
 * Créer un nouveau budget après validation stricte des données entrantes avec le schéma Zod.
 */
export const createBudget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    // Validation du corps de la requête (req.body) à l'aide du validateur Zod
    const body = createBudgetSchema.safeParse(req.body);
    if (!body.success) {
      // Envoi d'un rapport structuré des erreurs de validation (Statut 400 Bad Request)
      return res.status(400).json({ erreurs: body.error.format() });
    }

    // Appel du service métier pour effectuer l'insertion sécurisée en base de données
    const budget = await budgetService.createBudget(req.user.id, body.data);

    // Retour de l'entité nouvellement créée avec le statut HTTP 201 (Created)
    return res.status(201).json(budget);
  } catch (error) {
    next(error);
  }
};

/**
 * --- 3. GET /budgets/:id ---
 * Récupérer un budget spécifique par son identifiant unique.
 * Garantit l'isolation des données en vérifiant que le budget appartient bien à l'utilisateur.
 */
export const getBudgetById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    // Conversion et validation du paramètre de l'URL
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID invalide" });
    }

    // Recherche ciblée du budget via la couche service
    const budget = await budgetService.getBudgetById(id, req.user.id);
    if (!budget) {
      return res.status(404).json({ message: "Budget introuvable" });
    }

    return res.status(200).json(budget);
  } catch (error) {
    next(error);
  }
};

/**
 * --- 4. PATCH /budgets/:id ---
 * Mettre à jour partiellement les informations d'un budget existant.
 */
export const updateBudget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID invalide" });
    }

    // Validation de la payload partielle envoyée par le frontend avec Zod
    const body = updateBudgetSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ erreurs: body.error.format() });
    }

    // Transmission des modifications au service métier
    const updated = await budgetService.updateBudget(id, req.user.id, body.data);

    return res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

/**
 * --- 5. DELETE /budgets/:id ---
 * Supprimer définitivement un budget après contrôle des droits d'accès.
 */
export const deleteBudget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID invalide" });
    }

    // Exécution de l'opération de suppression via la couche service
    await budgetService.deleteBudget(id, req.user.id);

    // Réponse standard HTTP 204 (No Content) confirmant le succès de la suppression
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * --- 6. GET /budgets/:id/status ---
 * Calculer l'état actuel d'un budget (Suivi des dépenses par rapport au plafond fixé).
 */
export const getBudgetStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Utilisateur non authentifié" });
    }

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID invalide" });
    }

    // Sollicitation de la couche métier pour analyser et calculer le statut du budget
    const status = await budgetService.getBudgetStatus(id, req.user.id);
    if (!status) {
      return res.status(404).json({ message: "Budget introuvable" });
    }

    return res.status(200).json(status);
  } catch (error) {
    next(error);
  }
};