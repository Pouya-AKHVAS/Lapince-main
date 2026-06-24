import { prisma } from "../lib/prisma.js";

/**
 * Génère, actualise ou supprime de manière dynamique les alertes budgétaires d'un utilisateur.
 * Cette fonction est le cœur du système de monitoring des dépenses : elle est déclenchée
 * après chaque création, modification ou suppression de transaction afin de garantir
 * la synchronisation parfaite en temps réel entre les dépenses et les plafonds définis.
 * * @param budgetId - L'identifiant unique du budget à analyser
 * @param userId - L'identifiant de l'utilisateur propriétaire du budget (isolation des données)
 */
export const generateBudgetAlert = async (budgetId: number, userId: number) => {
  
  // 1. EXTRACTION DE L'ENVELOPPE BUDGÉTAIRE
  // On récupère le budget ciblé en y joignant sa catégorie pour connaître les règles de calcul.
  const budget = await prisma.budget.findFirst({
    where: { id: budgetId, userId },
    include: {
      category: true,
    },
  });

  // Sécurité passive : Si le budget n'existe pas ou n'appartient pas à l'utilisateur, on stoppe immédiatement.
  if (!budget) return null;

  // 2. CALCUL AGRÉGÉ DES DÉPENSES REELLES
  // On récupère l'ensemble des transactions associées à cette catégorie spécifique pour l'utilisateur.
  const transactionsForCategory = await prisma.transaction.findMany({
    where: { userId, categoryId: budget.category.id },
  });
  
  // Les dépenses étant stockées sous forme de valeurs positives, on réalise une somme cumulative (reduce).
  const spent = transactionsForCategory.reduce((sum, t) => sum + Number(t.amount), 0);

  // -------------------------------------------------------------------------
  // CORRECTION BUG 1 : NETTOYAGE AUTOMATIQUE (RETOUR AU VERT)
  // -------------------------------------------------------------------------
  // Si le total dépensé est inférieur ou égal à la limite du budget (cas typique
  // après la suppression d'une dépense ou une modification à la baisse),
  // l'alerte n'a plus lieu d'exister. On la supprime de la base de données.
  if (spent <= budget.limit_amount) {
    await prisma.alert.deleteMany({
      where: {
        userId,
        categoryId: budget.category.id,
      },
    });
    return null; // Le budget est assaini, on retourne null pour signifier l'absence d'alerte.
  }

  // 3. CALCUL DU MONTANT CRITIQUE DÉPASSÉ
  // Si le code atteint cette étape, c'est que le budget est officiellement dépassé.
  const exceededAmount = spent - budget.limit_amount;

  // 4. VÉRIFICATION DE L'EXISTENCE D'UNE ALERTE PRÉCÉDENTE
  // On cherche si une alerte existe déjà pour éviter de polluer l'interface avec des doublons.
  const existingAlert = await prisma.alert.findFirst({
    where: {
      userId,
      categoryId: budget.category.id,
    },
  });

  // -------------------------------------------------------------------------
  // CORRECTION BUG 2 : MISE À JOUR DYNAMIQUE DES MONTANTS (UPSERT LOGIC)
  // -------------------------------------------------------------------------
  // Si une alerte existe déjà, peu importe son état (lue ou non-lue), il faut impérativement
  // actualiser le montant dépassé qui a changé, et la repasser en non-lue (isRead: false)
  // pour que le composant de notification du frontend clignote à nouveau.
  if (existingAlert) {
    return await prisma.alert.update({
      where: { id: existingAlert.id },
      data: { 
        isRead: false,       // Force la réapparition de la notification sur le dashboard
        exceededAmount       // Sauvegarde le nouveau montant exact du dépassement recalculé
      },
    });
  }

  // 5. CRÉATION INITIALE DE L'ALERTE
  // Si aucune alerte n'existait au préalable pour cette catégorie, on la crée de zéro.
  const alert = await prisma.alert.create({
    data: {
      userId,
      categoryId: budget.category.id,
      exceededAmount,
    },
  });

  // 6. RETOUR DE L'ENTITÉ CRÉÉE
  return alert;
};