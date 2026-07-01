import { Loader2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import type { RegisterFormData, ApiError } from "../../types/auth";

interface RegisterFormProps {
  onSubmit: (data: RegisterFormData) => void;
  isLoading: boolean;
  error: ApiError | null;
}

export default function RegisterForm({
  onSubmit,
  isLoading,
  error: apiError,
}: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
// Pour gérer les erreurs de mot de passe incorrect côté client

  const [localError, setLocalError] = useState<ApiError | null>(null);
  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null); // Réinitialiser l'erreur locale avant chaque vérification

    const form = event.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirmPassword = (form.elements.namedItem("confirm") as HTMLInputElement).value;

    // Vérifier la concordance des deux mots de passe dans l'interface utilisateur avant de valider et d'envoyer l'e-mail
    if (password !== confirmPassword) {
      setLocalError({
        field: "confirm",
        message: "Les mots de passe ne correspondent pas",
      });
      return; // Mettre en pause l'opération d'envoi du formulaire
    }

    // // Créer des données d'inscription et ajouter un champ confirmPassword pour la couche de validation côté serveur (Zod)
    const data: RegisterFormData & { confirmPassword?: string } = {
      first_name: (form.elements.namedItem("first_name") as HTMLInputElement).value,
      last_name: (form.elements.namedItem("last_name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      password: password,
      confirmPassword: confirmPassword,
    };

    onSubmit(data as any);
  }

  // Combinaison et priorisation des erreurs (si une erreur locale existe, l'afficher ; sinon, afficher l'erreur du serveur)
  const error = localError || apiError;

  return (
    <form
      className="space-y-2"
      onSubmit={handleFormSubmit}
      role="form"
      aria-label="Formulaire d'inscription"
    >
      {[
        {
          id: "first_name",
          label: "Prénom",
          type: "text",
          placeholder: "Prénom",
        },
        {
          id: "last_name",
          label: "Nom",
          type: "text",
          placeholder: "Nom de famille",
        },
        {
          id: "email",
          label: "E-mail",
          type: "email",
          placeholder: "e-mail",
        },
        {
          id: "password",
          label: "Mot de passe",
          type: showPassword ? "text" : "password",
          placeholder: "mot de passe",
        },
        {
          id: "confirm",
          label: "Saisir de nouveau...",
          type: showConfirm ? "text" : "password",
          placeholder: "mot de passe",
        },
      ].map((field) => (
        <div key={field.id}>
          {/* Label accessible */}
          <label
            htmlFor={field.id}
            className="block text-[14px] font-black ml-4 mb-0.5 italic uppercase"
          >
            {field.label}
          </label>

          {/* Champ de saisie accessible */}
          <div className="flex items-center gap-2">
            <input
              id={field.id}
              name={field.id}
              type={field.type}
              placeholder={field.placeholder}
              disabled={isLoading}
              aria-invalid={error?.field === field.id}
              aria-describedby={
                error?.field === field.id ? `${field.id}-error` : undefined
              }
              className={cn(
                "w-full px-4 py-2.5 rounded-full bg-white/80 border-none text-[13px] shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                error?.field === field.id && "ring-2 ring-red-400",
              )}
              required
            />

            {/* Affichage du bouton de visibilité uniquement pour password et confirm */}
            {(field.id === "password" || field.id === "confirm") && (
              <button
                type="button"
                onClick={() =>
                  field.id === "password"
                    ? setShowPassword((prev) => !prev)
                    : setShowConfirm((prev) => !prev)
                }
                className="p-1 hover:bg-black/5 rounded-full transition-colors"
              >
                {field.id === "password" ? (
                  showPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )
                ) : showConfirm ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            )}
          </div>

          {/* Message d'erreur accessible */}
          {error?.field === field.id && (
            <p
              id={`${field.id}-error`}
              className="text-red-600 text-xs ml-4 mt-1"
              role="alert"
            >
              {error.message}
            </p>
          )}
        </div>
      ))}

      {/* Bouton de validation */}
      <div className="flex justify-center">
        <button
          type="submit"
          disabled={isLoading}
          className="w-fit px-10 py-2 bg-[#002b49] text-white rounded-full font-bold text-sm shadow-lg 
             hover:bg-[#003b63] active:scale-95 active:bg-[#001b2e] 
             transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="animate-spin w-4 h-4" />
          ) : (
            "S'inscrire"
          )}
        </button>
      </div>
    </form>
  );
}