import { it, expect } from "vitest";

import { sendVerificationEmail } from "./email.service.ts";

// Fonction d'attente
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

it("Connexion au serveur de messagerie requise", async () => {
await sleep(2000); // Attente de 2 secondes avant l'envoi de l'e-mail
await expect(sendVerificationEmail("test@lapince.fr", "token-123"))
.resolves.not.toThrow();

});