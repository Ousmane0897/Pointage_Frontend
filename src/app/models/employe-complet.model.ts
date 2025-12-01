export interface EmployeComplet {
    agentId: string;
    matricule: string;
    prenom: string;
    nom: string;
    sexe: string;
    heureDebut: string; 
    heureFin: string;
    dateNaissance: Date | null;
    lieuNaissance: string;
    nationalite: string;
    etatCivil: string;
    adresse: string;
    ville: string;
    telephone1: string;
    telephone2?: string | null;
    email: string;
    contactUrgence: string;
    lienDeParenteAvecContactUrgence: string;
    telephoneUrgent: string;
    agence: string;
    codeSite: string;
    villeSite: string;
    chefEquipe: string;
    managerOps: string;
    poste: string;
    typeContrat: string;
    dateEmbauche: Date | null;
    dateFinContrat?: Date | null;
    tempsDeTravail: string;
    horaire: string;
    salaireDeBase: string;
    primeTransport: string;
    primeAssiduite: string;
    primeRisque: string;
    ribCompteBancaire: string;
    banque: string;
    cnssOuIpres: string;
    ipmNumero?: string;
    permisConduire: 'OUI' | 'NON';
    categoriePermis?: string;
    statut: 'ACTIF' | 'Pause' | 'Sortie';
    motifSortie?: string;
    dateSortie: Date | null;
    observations: string;




}   