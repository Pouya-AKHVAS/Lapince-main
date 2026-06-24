import type { Request, Response, NextFunction } from "express";
import { categoryService } from "../services/category.service.ts";

/**
 * Récupérer toutes les catégories de l'application.
 * Ce contrôleur délègue entièrement la récupération des données à la couche service.
 */
export async function getAllCategory(req: Request, res: Response, next: NextFunction) {
  try {
    // Appel de la couche service pour récupérer la liste complète des catégories
    const categories = await categoryService.getAllCategories();
    
    // Retourne la liste des catégories avec un statut HTTP 200 (OK)
    return res.status(200).json(categories);
  } catch (error) {
    // Transfert automatique de l'erreur au gestionnaire global (Global Error Handler)
    next(error);
  } 
}

/**
 * Récupérer une catégorie spécifique par son identifiant unique (ID).
 * Valide le paramètre d'URL avant de solliciter la couche service.
 */
export async function getOneCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const categoryId = Number(id); 

    // Vérification de la validité de l'identifiant numérique
    if (isNaN(categoryId)) {
      return res.status(400).json({ message: "ID invalide" });
    }

    // Recherche de la catégorie correspondante via le service dédié
    const oneCategory = await categoryService.getCategoryById(categoryId);

    // Si la catégorie n'existe pas en base de données, retour d'une erreur 404
    if (!oneCategory) {
      return res.status(404).json({ message: "Catégorie introuvable" });
    }

    // Retourne les détails de la catégorie demandée
    return res.status(200).json(oneCategory);
  } catch (error) {
    // Redirection de l'exception vers le middleware centralisé de gestion des erreurs
    next(error);
  }
}

/**
 * Créer une nouvelle catégorie.
 * Vérifie la présence des champs obligatoires avant l'insertion en base de données.
 */
export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, color } = req.body;

    // Validation stricte des données requises pour la création
    if (!name || !color) {
      return res.status(400).json({ message: "Le nom et la couleur sont requis" });
    }

    // Appel au service pour enregistrer la nouvelle entité en BDD
    const newCategory = await categoryService.createCategory({ name, color });
    
    // Retourne la catégorie créée avec le code HTTP 201 (Created)
    return res.status(201).json(newCategory);
  } catch (error) {
    next(error);
  }
}

/**
 * Modifier une catégorie existante.
 * Transmet les modifications partielles à la couche service.
 */
export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID invalide" });
    }

    const { name, color } = req.body;
    
    // Transmission des nouvelles valeurs au service pour mise à jour sécurisée
    const updatedCategory = await categoryService.updateCategory(id, { name, color });

    return res.status(200).json(updatedCategory);
  } catch (error) {
    next(error);
  }
}

/**
 * Supprimer définitivement une catégorie de la base de données.
 */
export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "ID invalide" });
    }

    // Exécution de l'opération de suppression via la couche de service
    await categoryService.deleteCategory(id);
    
    return res.status(200).json({ message: "Catégorie supprimée avec succès" });
  } catch (error) {
    next(error);
  }
}