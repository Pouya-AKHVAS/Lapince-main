import type { Request, Response, NextFunction } from "express";
import { updateUserSchema } from "../validators/user.validator.js"; // import de updateUserSchema ZOD
import { userService } from "../services/user.service.ts"; // Importation de la couche service

// GET /users/me
// Retourne le profil de l'utilisateur connecté (sans le mot de passe)
export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.user!.id;

    // --- APPEL DE LA COUCHE SERVICE ---
    // On délègue la récupération des données utilisateur au service dédié
    const user = await userService.getUserProfile(id);

    if (!user) {
      res.status(404).json({ message: "Utilisateur introuvable" });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    next(error); // Passe l'erreur au Global Error Handler
  }
}

// PATCH /users/me
// Met à jour les informations du profil
export async function updateMe(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.user!.id;

    // Validation des données entrantes avec Zod (même pattern que auth.controller)
    // safeParse ne lève pas d'erreur, il retourne { success, data } ou { success, error }
    const result = updateUserSchema.safeParse(req.body); 
    
    if (!result.success) {
      // On récupère le premier problème de validation (ex: format email incorrect)
      const firstIssue = result.error.issues[0];
      res.status(400).json({
        message: firstIssue?.message ?? "Données invalides",
        field: firstIssue?.path[0] as string | undefined
      });
      return;
    }

    const { first_name, last_name, email, password, photo } = result.data;

    // --- APPEL DE LA COUCHE SERVICE ---
    // La gestion de l'email unique, du hachage Argon2 et de l'écriture en BDD est déléguée au service
    const user = await userService.updateUserProfile(id, { first_name, last_name, email, password, photo });

    res.status(200).json({ message: "Profil mis à jour", user });
  } catch (error: any) {
    // Gestion spécifique des conflits d'email pour renvoyer le format attendu par le front
    if (error.statusCode === 409) {
      res.status(409).json({ message: error.message, field: error.field });
      return;
    }
    next(error); // Passe l'erreur au Global Error Handler
  }
}

// DELETE /users/me
// Supprime le compte utilisateur connecté
export async function deleteMe(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.user!.id;

    // --- APPEL DE LA COUCHE SERVICE ---
    // La vérification d'existence et la suppression en BDD sont gérées par le service
    await userService.deleteUserProfile(id);

    res.status(200).json({ message: "Compte supprimé avec succès" });
  } catch (error: any) {
    if (error.statusCode === 404) {
      res.status(404).json({ message: error.message });
      return;
    }
    next(error); // Passe l'erreur au Global Error Handler
  }
}