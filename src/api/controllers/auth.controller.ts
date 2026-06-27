import type { Request, Response, NextFunction } from "express";
import crypto from "crypto"; //  Utilisé pour générer le jeton (token) de vérification unique au monde
import { config } from "../config.ts";
import type { Token, User } from "../models/index.ts";
import { prisma } from "../lib/prisma.js";
import { BadRequestError, UnauthorizedError } from "../lib/error.ts";
import { generateAuthTokens } from "../lib/tokens.ts";
import { registerSchema, loginSchema } from "../validators/auth.validator.js"; // Import des schémas Zod
import { authService } from "../services/auth.service.ts"; // Importation de la couche service
import { sendVerificationEmail } from "../services/email.service.ts"; //  Importation du service d'envoi de mail

// ==========================================
// HELPERS COMPATIBLES AVEC TA LOGIQUE EXISTANTE
// ==========================================

async function replaceRefreshTokenInDatabase(refreshToken: Token, user: User) {
  await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

  await prisma.refreshToken.create({
    data: {
      token: refreshToken.token,
      userId: user.id,
      createdAt: new Date(),
      expiresAt: new Date(new Date().getTime() + refreshToken.expiresIn),
    },
  });
}

function setAccessTokenCookie(res: Response, accessToken: Token) {
  res.cookie("accessToken", accessToken.token, {
    httpOnly: true,
    secure: config.isProd, // HTTPS uniquement en production
    sameSite: config.isProd ? "none" : "lax", // En local on utilise "lax" pour accepter le HTTP
    maxAge: accessToken.expiresIn,
  });
}

function setSessionIndicatorCookie(res: Response, accessToken: Token) {
  // Cookie lisible par JS (non-httpOnly) — contient uniquement un flag, aucune donnée sensible.
  // Permet au frontend de savoir si une session existe sans faire d'appel API inutile.
  res.cookie("sessionExists", "1", {
    httpOnly: false,
    secure: config.isProd,
    sameSite: config.isProd ? "none" : "lax",
    maxAge: accessToken.expiresIn,
  });
}

function setRefreshTokenCookie(res: Response, refreshToken: Token) {
  res.cookie("refreshToken", refreshToken.token, {
    httpOnly: true, // Protège contre les attaques XSS (non accessible via JS)
    secure: config.isProd,
    sameSite: config.isProd ? "none" : "lax",
    maxAge: refreshToken.expiresIn,
    path: config.isProd ? "/api/auth/refresh" : "/auth/refresh",
  });
}

// ==========================================
// ACTIONS DU CONTRÔLEUR D'AUTHENTIFICATION
// ==========================================

// Contrôleur appelé par POST /auth/register
export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    // Bouncer : On valide le body avec le schéma Zod
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
      // On récupère le premier problème de validation (ex: mot de passe trop court)
      const firstIssue = result.error.issues[0];
      res.status(400).json({
        message: firstIssue?.message ?? "Données invalides",
        field: firstIssue?.path[0] as string | undefined,
      });
      return;
    }

    // Si la validation passe, on extrait les champs sécurisés depuis result.data
    const { first_name, last_name, email, password, photo } = result.data;

    //  SÉCURITÉ : Génération d'un UUID unique (v4) qui servira de jeton de vérification par e-mail
    const verificationToken = crypto.randomUUID();

    // --- APPEL DE LA COUCHE SERVICE ---
    // On délègue la vérification, le hachage Argon2 et l'insertion en BDD avec isVerified: false au service
    const user = await authService.registerUser({
      first_name,
      last_name,
      email,
      passwordPlain: password,
      photo,
      verificationToken, //  Transmission du jeton de sécurité à la couche métier
    });

    //  ENVOI DE L'E-MAIL TRANSACTIONNEL D'ACTIVATION
    // L'envoi est asynchrone et se fait en arrière-plan pour ne pas bloquer la réponse client
    await sendVerificationEmail(email, verificationToken);

    // MODIFICATION MAJEURE : Un utilisateur non vérifié ne doit PAS être connecté immédiatement.
    // Les cookies d'authentification automatique ont été supprimés ici.
    res.status(201).json({
      message:
        "Inscription réussie. Veuillez vérifier votre boîte e-mail pour activer votre compte.",
    });
  } catch (error: any) {
    if (error.statusCode === 409) {
      res.status(409).json({ message: error.message, field: error.field });
      return;
    }
    next(error); // Passe l'erreur au Global Error Handler
  }
}

// Contrôleur appelé par POST /auth/login
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    // Bouncer Zod (safeParseAsync ne plante pas en cas d'erreur)
    const result = await loginSchema.safeParseAsync(req.body);
    if (!result.success) { 
      const firstIssue = result.error.issues[0]; 
      res.status(400).json({ 
        message: firstIssue?.message ?? "Données invalides", 
        field: firstIssue?.path[0] as string | undefined, 
      }); 
      return; 
    }

    const { email, password } = result.data; 

//  Nouvelle étape : Nous récupérons d’abord l’utilisateur directement depuis la base de données pour vérifier son statut d’approbation.
  const existingUser = await prisma.user.findUnique({ where: { email } });

// Si l'utilisateur existe mais n'a pas encore vérifié son adresse e-mail :
   if (existingUser && !(existingUser as any).isVerified) {
  res.status(403).json({
    message: "Votre compte n'est pas encore activé. Veuillez valider votre adresse e-mail.",
    field: "email",
  });
  return;
}

    // --- APPEL DE LA COUCHE SERVICE ---
    // Maintenant que nous sommes sûrs que l'utilisateur est authentifié, nous vérifions son mot de passe de connexion.    
    const user = await authService.verifyLogin(email, password);

    // Si le compte est valide et activé, on génère les 2 tokens (access/refresh) 
    const { accessToken, refreshToken } = generateAuthTokens(user); 

    // Stocker ou remplacer le refresh token en BDD 
    await replaceRefreshTokenInDatabase(refreshToken, user); 

    // Déploiement des cookies HTTP-Only hautement sécurisés 
    setAccessTokenCookie(res, accessToken); 
    setRefreshTokenCookie(res, refreshToken); 
    setSessionIndicatorCookie(res, accessToken); 

    res.json({ 
      accessToken, 
      refreshToken, 
    }); 
  } catch (error) {
    next(error); 
  }
}

//  NOUVELLE ACTION : Appelée par GET /auth/verify/:token
// Cette action intercepte le clic de l'utilisateur depuis sa boîte mail
export async function verifyEmail(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { token } = req.params;

    // 1. Recherche de l'utilisateur détenant ce jeton unique d'activation
    const user = await prisma.user.findFirst({
      where: { ["verificationToken" as any]: token } as any,
    });

    // Sécurité : Si le jeton n'existe pas ou a déjà été purgé, on refuse l'activation
    if (!user) {
      res
        .status(404)
        .json({ message: "Jeton de vérification invalide ou expiré." });
      return;
    }

    // 2. Activation du compte et purge du jeton pour éviter toute réutilisation malveillante (Replay Attack)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null, // Le jeton devient obsolète immédiatement
      },
    });

    // 3. Redirection de l'utilisateur vers la page de login du Frontend avec un indicateur de succès
    const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_BASE_URL || (config.isProd ? "https://lapince.fr" : "http://localhost:8080");
    res.redirect(`${frontendUrl.replace(/\/$/, "")}/login?verified=true`);
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      throw new BadRequestError("Refresh token manquant");
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedError("Refresh token invalide ou expiré");
    }

    const user = storedToken.user;
    const newTokens = generateAuthTokens(user as unknown as User);

    await replaceRefreshTokenInDatabase(
      newTokens.refreshToken,
      user as unknown as User,
    );

    setAccessTokenCookie(res, newTokens.accessToken);
    setRefreshTokenCookie(res, newTokens.refreshToken);
    setSessionIndicatorCookie(res, newTokens.accessToken);

    res.json({ accessToken: newTokens.accessToken.token });
  } catch (error) {
    next(error);
  }
}

export async function logoutUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken", {
      path: config.isProd ? "/api/auth/refresh" : "/auth/refresh",
    });
    res.clearCookie("sessionExists");
    if (req.user) {
      await prisma.refreshToken.deleteMany({ where: { userId: req.user.id } });
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
