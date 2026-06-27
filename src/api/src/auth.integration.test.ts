import { describe, it, expect, afterAll, vi } from "vitest";
import request from "supertest";
import app from "./index.js";
import { prisma } from "../lib/prisma.js";

vi.mock("../services/email.service.ts", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(true)
}));

const testEmail = `test_${Date.now()}@lapince.fr`;

afterAll(async () => {
  // Nettoyage global après les tests
  await prisma.user.deleteMany({ where: { email: { contains: "@lapince.fr" } } });
  await prisma.$disconnect();
});

describe("POST /auth/register", () => {
  it("crée un compte et retourne 201 avec un message de confirmation", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({
        first_name: "Test",
        last_name:  "User",
        email:      testEmail,
        password:   "Motdepasse1@",
      });

    expect(res.status).toBe(201);
    // On vérifie la présence d'un message (vu que l'activation se fait par mail)
    expect(res.body).toHaveProperty("message");
  });

  it("refuse un doublon d'email avec 409", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({
        first_name: "Test",
        last_name:  "User",
        email:      testEmail,
        password:   "Motdepasse1@",
      });

    expect(res.status).toBe(409);
  });

  it("refuse un mot de passe sans majuscule ni caractère spécial avec 400", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({
        first_name: "Test",
        last_name:  "User",
        email:      "autre@lapince.fr",
        password:   "trop_court",
      });

    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  
  // Scénario 1 : Bloquer un utilisateur non vérifié (code 403)
  it("refuse la connexion avec 403 si l'e-mail n'est pas encore vérifié", async () => {
    const unverifiedEmail = `unverified_${Date.now()}@lapince.fr`;
    
    // On crée l'utilisateur directement avec le flag isVerified: false
    await prisma.user.create({
      data: {
        first_name: "Not",
        last_name: "Verified",
        email: unverifiedEmail,
        password: "Motdepasse1@", // Note: Si ton auth utilise argon2 en réel, ce champ importe peu ici car la 403 doit bloquer avant ou après validation
        isVerified: false 
      }
    });

    // ATTENTION : On tente de se connecter avec le BON email de ce compte non vérifié
    const res = await request(app)
      .post("/auth/login")
      .send({
        email: unverifiedEmail,
        password: "Motdepasse1@",
      });

    // Le contrôleur doit interdire l'accès (403)
    expect(res.status).toBe(403);
    
    // Nettoyage local
    await prisma.user.deleteMany({ where: { email: unverifiedEmail } });
  });

  // Scénario 2 : Erreur d'identifiants incorrects (code 401)
  it("refuse la connexion avec 401 pour un utilisateur inexistant", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({
        email: `nobody_${Date.now()}@lapince.fr`, // Cet email n'existe pas du tout, donc pas de conflit de 403
        password: "MauvaisPassword123",
      });

    expect(res.status).toBe(401);
  });
});