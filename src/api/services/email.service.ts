import nodemailer from "nodemailer";
import { config } from "../config.ts";

export function buildVerificationUrl(token: string, apiBaseUrl?: string) {
  const finalBaseUrl = apiBaseUrl || config.apiBaseUrl || "http://localhost:3007";
  
  const normalizedBaseUrl = finalBaseUrl.startsWith("http://") || finalBaseUrl.startsWith("https://")
    ? finalBaseUrl
    : `http://${finalBaseUrl}`;

  return `${normalizedBaseUrl.replace(/\/$/, "")}/auth/verify/${token}`;
}

const transporter = nodemailer.createTransport({
  host: config.email.host || process.env.SMTP_HOST || process.env.MAIL_HOST,
  port: config.email.port || parseInt(process.env.SMTP_PORT || process.env.MAIL_PORT || "587"),
  auth: {
    user: config.email.user || process.env.SMTP_USER || process.env.MAIL_USER,
    pass: config.email.pass || process.env.SMTP_PASSWORD || process.env.MAIL_PASS,
  },
});

/**
 * Envoie un e-mail transactionnel de vérification pour l'inscription.
 */
export const sendVerificationEmail = async (to: string, token: string) => {
  try {
    console.log("Attempting to send email with host:", process.env.MAIL_HOST);
    const verificationUrl = buildVerificationUrl(token);

    const mailOptions = {
      from: '"La Pince" <contact@lapince.pooya-dev.com>',
      to: to,
      subject: "Activez votre compte - La Pince",
    html: `
      <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <h2 style="color: #002b49; text-align: center;">Bienvenue sur La Pince</h2>
        <p>Merci pour votre inscription. Pour des raisons de sécurité, veuillez activer votre compte en cliquant sur le bouton ci-dessous :</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${verificationUrl}" style="background-color: #FF6855; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; display: inline-block;">
            Vérifier mon adresse e-mail
          </a>
        </div>
        <p style="font-size: 11px; color: #666; text-align: center;">Si le bouton ne fonctionne pas, copiez ce lien : <br/> ${verificationUrl}</p>
      </div>
    `,
  };

  const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully: %s", info.messageId);
  } catch (error) {
    console.error("FAILED to send email:", error);
    throw new Error("Impossible d'envoyer l'e-mail de vérification.");
  }
};