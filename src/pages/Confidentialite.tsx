import LegalLayout from "@/components/legal/LegalLayout";

const SUBPROCESSORS: [string, string, string][] = [
  ["Supabase", "Base de données, authentification, stockage", "UE / États-Unis"],
  ["Vercel", "Hébergement de l'application web", "UE / États-Unis"],
  ["Stripe", "Traitement des paiements", "UE / États-Unis"],
  ["FAL.ai", "Génération d'images", "États-Unis"],
  ["Google (Gemini)", "Génération de texte", "États-Unis"],
  ["Groq", "Génération de texte (secours)", "États-Unis"],
];

export default function Confidentialite() {
  return (
    <LegalLayout title="Politique de confidentialité" updatedAt="6 juillet 2026">
      <p>
        DreamWeave respecte votre vie privée et se conforme au Règlement Général sur la Protection
        des Données (RGPD). Cette politique explique quelles données nous collectons, pourquoi, et
        quels sont vos droits.
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement est [RAISON SOCIALE], [FORME JURIDIQUE], [ADRESSE SIÈGE]. Pour
        toute question relative à vos données : [EMAIL CONTACT].
      </p>

      <h2>2. Données que nous collectons</h2>
      <ul>
        <li>
          <strong>Données de compte</strong> : adresse email et nom d'affichage, via Supabase Auth
          (connexion par email ou Google).
        </li>
        <li>
          <strong>Contenu que vous créez</strong> : projets, personnages et décors générés,
          scénarios, images. Ce contenu vous appartient (voir les CGU).
        </li>
        <li>
          <strong>Données de paiement</strong> : gérées exclusivement par Stripe. DreamWeave ne
          stocke ni ne consulte vos numéros de carte ; nous conservons uniquement un identifiant
          client Stripe et votre plan.
        </li>
        <li>
          <strong>Données d'usage</strong> : nombre de générations effectuées (crédits), afin
          d'appliquer les quotas de votre plan, ainsi que des statistiques d'usage agrégées.
        </li>
      </ul>

      <h2>3. Finalités et bases légales</h2>
      <ul>
        <li>Fournir le service (création de webtoons, génération par IA) : exécution du contrat.</li>
        <li>Gérer votre abonnement et la facturation : exécution du contrat et obligation légale.</li>
        <li>Améliorer le produit via des statistiques agrégées : intérêt légitime.</li>
      </ul>
      <p>Nous n'utilisons pas vos données à des fins publicitaires et ne les vendons pas.</p>

      <h2>4. Génération par IA et traitement de vos contenus</h2>
      <p>
        Pour générer images et textes, vos descriptions (prompts), scénarios et images de référence
        sont transmis à nos sous-traitants d'IA (FAL.ai, Google Gemini, Groq). Évitez de saisir des
        données personnelles sensibles dans vos prompts.
      </p>

      <h2>5. Sous-traitants et destinataires</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-foreground">
              <th className="py-2 pr-4 text-left font-semibold">Sous-traitant</th>
              <th className="py-2 pr-4 text-left font-semibold">Rôle</th>
              <th className="py-2 text-left font-semibold">Localisation</th>
            </tr>
          </thead>
          <tbody>
            {SUBPROCESSORS.map(([name, role, loc]) => (
              <tr key={name} className="border-t border-border/60">
                <td className="py-2 pr-4 font-medium text-foreground">{name}</td>
                <td className="py-2 pr-4">{role}</td>
                <td className="py-2">{loc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3">
        Les transferts hors Union européenne sont encadrés par des clauses contractuelles types.
      </p>

      <h2>6. Durée de conservation</h2>
      <p>
        Vos données sont conservées tant que votre compte est actif. À la suppression de votre
        compte, vos données personnelles et vos contenus sont supprimés sous 30 jours, sauf
        obligation légale de conservation (facturation).
      </p>

      <h2>7. Sécurité</h2>
      <p>
        Isolation stricte des données par utilisateur (Row Level Security PostgreSQL) et chiffrement
        des échanges en transit (HTTPS). Chaque utilisateur n'accède qu'à ses propres données.
      </p>

      <h2>8. Vos droits (RGPD)</h2>
      <p>
        Vous disposez des droits d'accès, de rectification, d'effacement, de portabilité, de
        limitation et d'opposition. Pour les exercer, écrivez à [EMAIL CONTACT]. Vous pouvez
        également introduire une réclamation auprès de la CNIL (
        <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">
          www.cnil.fr
        </a>
        ).
      </p>

      <h2>9. Cookies</h2>
      <p>
        DreamWeave utilise uniquement des cookies strictement nécessaires au fonctionnement (session
        d'authentification). Aucun cookie publicitaire ni traceur tiers.
      </p>

      <h2>10. Modifications</h2>
      <p>Cette politique peut évoluer. La date de dernière mise à jour figure en tête de page.</p>
    </LegalLayout>
  );
}
