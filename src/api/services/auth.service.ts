import argon2 from "argon2";
import { prisma } from "../lib/prisma.js";
import type { User } from "../models/index.ts";
import { UnauthorizedError } from "../lib/error.ts";

export const authService = {
  /**
   * Opération métier pour inscrire un utilisateur
   * Vérifie l'unicité de l'email, hache le mot de passe et crée l'enregistrement
   */
  registerUser: async (data: { first_name: string; last_name: string; email: string; passwordPlain: string; photo?: string | null | undefined; }) => {
    // On vérifie que l'email n'est pas déjà utilisé dans la base
    // findUnique retourne null si aucun utilisateur n'a cet email
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      const error = new Error("Cet email est déjà utilisé");
      (error as any).statusCode = 409;
      (error as any).field = "email";
      throw error;
    }

    // On ne stocke jamais un mot de passe en clair
    // argon2 est un algorithme de hachage sécurisé, conçu pour être lent et résistant aux attaques
    const hashedPassword = await argon2.hash(data.passwordPlain);

    // On crée l'utilisateur en base via Prisma
    // Le champ select permet de choisir exactement ce qu'on retourne — le hash du mot de passe est volontairement exclu
    return await prisma.user.create({
      data: { 
        first_name: data.first_name, 
        last_name: data.last_name, 
        email: data.email, 
        password: hashedPassword, 
        photo: data.photo === undefined ? null : data.photo, 
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        photo: true,
        createdAt: true,
      },
    });
  },

  /**
   * Opération métier pour vérifier les identifiants de connexion
   * Cherche l'utilisateur et valide la correspondance du hash du mot de passe
   */
  verifyLogin: async (email: string, passwordPlain: string): Promise<User> => {
    // Récupérer l'utilisateur dans la BDD
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) {
      throw new UnauthorizedError("Le login et le mot de passe ne correspondent pas");
    }

    // Vérifier que le mot de passe et le hash correspondent
    const isMatching = await argon2.verify(user.password, passwordPlain);
    if (!isMatching) {
      throw new UnauthorizedError("Le login et le mot de passe ne correspondent pas");
    }

    return user as unknown as User;
  }
};