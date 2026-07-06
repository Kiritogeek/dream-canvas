import LegalLayout from "@/components/legal/LegalLayout";

export default function CGU() {
  return (
    <LegalLayout title="Conditions Générales d'Utilisation" updatedAt="6 juillet 2026">
      <h2>1. Mentions légales et éditeur</h2>
      <p>
        Le service DreamWeave est édité par [RAISON SOCIALE], [FORME JURIDIQUE] au capital de
        [CAPITAL], immatriculée sous le numéro [SIRET], dont le siège social est situé
        [ADRESSE SIÈGE]. Directeur de la publication : [DIRECTEUR DE PUBLICATION]. Contact :
        [EMAIL CONTACT]. Hébergement : Supabase Inc. et Vercel Inc.
      </p>

      <h2>2. Objet</h2>
      <p>
        Les présentes conditions régissent l'accès et l'utilisation de DreamWeave, outil de création
        de webtoons et mangas assisté par intelligence artificielle.
      </p>

      <h2>3. Acceptation</h2>
      <p>La création d'un compte vaut acceptation pleine et entière des présentes conditions.</p>

      <h2>4. Description du service</h2>
      <p>
        DreamWeave permet de créer des projets, générer des personnages et décors cohérents par IA,
        écrire un scénario, le découper en cases et composer des planches. Le service est proposé
        selon trois plans :
      </p>
      <ul>
        <li>
          <strong>Libre</strong> : 0 €/mois, 20 crédits.
        </li>
        <li>
          <strong>Créateur</strong> : 12,99 €/mois, 100 crédits.
        </li>
        <li>
          <strong>Studio</strong> : 29,99 €/mois, 250 crédits.
        </li>
      </ul>
      <p>
        Toutes les fonctionnalités sont disponibles sur tous les plans ; ceux-ci se distinguent
        uniquement par le volume de crédits. 1 crédit équivaut à 1 génération (personnage, fiche ou
        case). Les crédits se renouvellent à chaque période de facturation et ne sont pas reportés.
      </p>

      <h2>5. Compte utilisateur</h2>
      <p>
        Vous êtes responsable de la confidentialité de vos identifiants et de toute activité sur
        votre compte. Vous devez avoir au moins 15 ans ou disposer de l'autorisation d'un
        représentant légal.
      </p>

      <h2>6. Abonnement, paiement et résiliation</h2>
      <p>
        Les abonnements payants sont gérés via Stripe et reconduits automatiquement à chaque période.
        Vous pouvez résilier à tout moment depuis votre espace (portail client Stripe) ; la
        résiliation prend effet à la fin de la période en cours. S'agissant d'un service numérique à
        exécution immédiate, vous reconnaissez renoncer à votre droit de rétractation pour les
        crédits déjà consommés.
      </p>

      <h2>7. Propriété intellectuelle</h2>
      <p>
        Vous conservez l'ensemble des droits sur les œuvres que vous créez avec DreamWeave. Vous
        accordez à DreamWeave une licence strictement technique et non exclusive permettant
        d'héberger, stocker et afficher vos contenus dans le cadre du service. Vous êtes seul
        responsable des contenus que vous générez et de leur conformité au droit, notamment en
        matière de contrefaçon et de droits de tiers.
      </p>

      <h2>8. Contenus interdits</h2>
      <p>
        Il est interdit de générer ou publier via DreamWeave des contenus illégaux, haineux,
        diffamatoires, portant atteinte aux droits de tiers ou à caractère pédopornographique. Tout
        manquement peut entraîner la suspension du compte.
      </p>

      <h2>9. Disponibilité et responsabilité</h2>
      <p>
        Le service est fourni « en l'état », sans garantie de disponibilité continue. Les résultats
        générés par IA peuvent comporter des imperfections. Dans les limites permises par la loi, la
        responsabilité de l'éditeur est limitée au montant payé au cours des douze derniers mois.
      </p>

      <h2>10. Résiliation</h2>
      <p>
        Vous pouvez supprimer votre compte à tout moment. L'éditeur peut suspendre un compte en cas
        de violation des présentes conditions.
      </p>

      <h2>11. Droit applicable</h2>
      <p>
        Les présentes conditions sont soumises au droit français. Tout litige relève de la compétence
        des tribunaux français, sous réserve des règles impératives de protection des consommateurs.
      </p>
    </LegalLayout>
  );
}
