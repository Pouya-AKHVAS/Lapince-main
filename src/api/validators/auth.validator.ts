import { z } from "zod";

export const registerSchema = z
  .object({
    first_name: z.string().min(1, "Le prénom est requis"),
    last_name:  z.string().min(1, "Le nom est requis"),
    photo:      z.string().optional(),
    email:      z.string().email("Format d'email invalide"),
    password:   z.string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères")
      .regex(/[A-Z]/, "Le mot de passe doit contenir au moins une lettre majuscule")
      .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre")
      .regex(/[@$!%*?&]/, "Le mot de passe doit contenir au moins un caractère spécial (@, $, !, %, *, ?, &)"),
    // Ajouter un deuxième champ de mot de passe au schéma
    confirmPassword: z.string().min(1, "La confirmation du mot de passe est requise")
  })
  //  Ajouter une condition de comparaison entre les deux mots de passe
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"], // L'erreur sera affichée exactement sur le champ de confirmation du mot de passe
  });

export const loginSchema = z.object({
  email: z.string().email("Veuillez fournir une adresse email valide"),
  password: z.string().min(1, "Le mot de passe est requis")
});