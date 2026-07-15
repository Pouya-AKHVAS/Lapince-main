import { useState, type FormEvent } from "react";
import type { LoginCredentials } from "../../services/authApi";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
/**
 * Interface pour typer l'objet d'erreur provenant du backend
 */
interface ApiError {
  message: string;
  field?: "email" | "password"; // Permet d'identifier précisément le champ en erreur
}

interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => void; // La fonction à appeler quand le formulaire est soumis
  isLoading: boolean;
  error: ApiError | string | null; // Accepte désormais l'objet d'erreur structuré
}

export default function LoginForm({
  onSubmit,
  isLoading,
  error,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Normalisation de l'erreur pour extraire le message global et le champ spécifique
  const errorMessage = typeof error === "string" ? error : error?.message || null;
  const errorField = typeof error === "object" ? error?.field : undefined;

  /**
   * Utilisation de FormEvent avec le type générique HTMLFormElement
   * pour éviter la dépréciation et assurer le typage correct.
   */
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // On remonte les données au parent
    onSubmit({ email, password });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Affichage de l'erreur globale renvoyée par le parent si aucun champ spécifique n'est ciblé */}
      {errorMessage && !errorField && (
        <p className="text-red-600 text-[11px] text-center font-bold italic bg-red-100/50 py-1 rounded-full">
          {errorMessage}
        </p>
      )}

      {/* Champ E-mail */}
      <div>
        <label
          htmlFor="email"
          className="block text-[14px] font-black ml-4 mb-0.5 italic uppercase text-[#002b49]"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e-mail"
          className={`w-full px-4 py-2.5 rounded-full bg-white/80 border text-[13px] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-[#002b49] transition-all ${
            errorField === "email" ? "border-red-500 ring-1 ring-red-500 bg-red-50/50" : "border-transparent"
          }`}
          disabled={isLoading}
        />
        {/* Affichage ciblé de l'erreur sous le champ e-mail */}
        {errorField === "email" && (
          <p className="text-red-600 text-[11px] font-bold italic ml-4 mt-1">
            {errorMessage}
          </p>
        )}
      </div>

      {/* Champ Mot de passe */}
      <div>
        <label
          htmlFor="password"
          className="block text-[14px] font-black ml-4 mb-0.5 italic uppercase text-[#002b49]"
        >
          Mot de passe
        </label>
        <div className="flex items-center gap-2">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="mot de passe"
            className={`w-full px-4 py-2.5 rounded-full bg-white/80 border text-[13px] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-[#002b49] transition-all ${
              errorField === "password" ? "border-red-500 ring-1 ring-red-500 bg-red-50/50" : "border-transparent"
            }`}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(prev => !prev)}
            className="text-[#002b49] hover:opacity-70 transition-opacity"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {/* Affichage ciblé de l'erreur sous le champ mot de passe */}
        {errorField === "password" && (
          <p className="text-red-600 text-[11px] font-bold italic ml-4 mt-1">
            {errorMessage}
          </p>
        )}
      </div>

      {/* Bouton de soumission */}
      <div className="flex justify-center pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-fit px-8 py-2 bg-[#002b49] text-white rounded-full font-bold text-sm shadow-lg hover:bg-[#003b63] transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="animate-spin w-4 h-4" />
          ) : (
            "Se connecter"
          )}
        </button>
      </div>

      <p className="text-center text-[11px] font-bold mt-4 text-[#002b49]">
        Pas encore de compte ?
        <Link to="/register" className="underline ml-1 hover:text-blue-700 transition-colors">
  Créer un compte
</Link>
      </p>
    </form>
  );
}