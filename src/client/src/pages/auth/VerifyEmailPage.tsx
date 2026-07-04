import { useEffect, useState } from "react";

import { useParams, useNavigate } from "react-router-dom";

const VerifyEmailPage = () => {
const { token } = useParams(); // Récupérer le jeton à partir de l'adresse
const navigate = useNavigate();

const [status, setStatus] = useState("Vérification en cours...");

useEffect(() => {
const verify = async () => {
try {
// Remplacez cette adresse par votre adresse API réelle
const response = await fetch(`http://api.lapince.pooya-dev.com:3007/auth/verify/${token}`);

if (response.ok) {
setStatus("Votre compte a été activé avec succès ! Redirection vers la page de connexion...");
setTimeout(() => navigate("/login"), 3000);

} else {
setStatus("Erreur lors de la vérification de l'adresse e-mail. Le jeton a peut-être expiré.");

}
} catch (error) {
setStatus("Erreur de communication avec le serveur.");

}
};

if (token) verify();

}, [token, navigate]);

return (
<div style={{ textAlign: "center", marginTop: "50px" }}>

<h2>Vérifier l'e-mail</h2>

<p>{status}</p>
</div>
);

};

export default VerifyEmailPage;