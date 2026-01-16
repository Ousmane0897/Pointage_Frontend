export interface EmployeComplet {
    id?: string;
    agentId: string;
    matricule: string;
    prenom: string;
    nom: string;
    sexe: string;
    heureDebut: string; 
    heureFin: string;
    heureDebut2?: string; 
    heureFin2?: string;
    joursDeTravail?: string;
    matin?: boolean;
    apresMidi?: boolean;
    joursDeTravail2?: string;
    dateNaissance: Date | null;
    lieuNaissance: string;
    nationalite: string;
    etatCivil: string;
    adresse: string;
    ville: string;
    telephone1: string;
    telephone2?: string | null;
    email?: string;
    contactUrgence: string;
    lienDeParenteAvecContactUrgence: string;
    telephoneUrgent: string;
    agence: string[]; // Liste des agences/sites
    codeSite?: string;
    villeSite?: string;
    chefEquipe?: string;
    managerOps?: string;
    codeSite2?: string;
    villeSite2?: string;
    chefEquipe2?: string;
    managerOps2?: string;
    poste: string;
    typeContrat: string;
    dateEmbauche: Date | null;
    dateFinContrat?: Date | null;
    tempsDeTravail: string;
    horaire: string;
    salaireDeBase: string;
    primeTransport?: string;
    primeAssiduite?: string;
    primeRisque?: string;
    ribCompteBancaire?: string;
    banque?: string;
    cnssOuIpres?: string;
    ipmNumero?: string;
    permisConduire: 'OUI' | 'NON';
    categoriePermis?: string;
    statut: 'ACTIF' | 'PAUSE' | 'SORTIE';
    motifSortie?: string;
    dateSortie?: Date | null;
    observations?: string;




}   