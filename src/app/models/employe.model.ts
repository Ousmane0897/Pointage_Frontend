export interface Employe {
    codeSecret: string;
    agentId: string;
    nom: string;
    prenom: string;
    numero: string;
    intervention: string;
    statut: string;
    employeCreePar: string | null;
    site: string[]; // Assuming site is an array of strings
    siteAvantDeplacement?: string; // Optional field for site before movement
    //siteDestination: string;
    joursDeTravail: string;
    joursDeTravail2?: string;
    matin?: boolean; 
    apresMidi?: boolean; 
    deplacement: boolean;
    remplacement: boolean;
    heureDebut: string;
    heureFin: string;    
    heureDebutAvantDeplacement?: string;
    heureFinAvantDeplacement?: string;
    heureDebut2?: string; // Optional field for additional start time
    heureFin2?: string; // Optional field for additional end time
    heureDebutAvantDeplacement2?: string;
    heureFinAvantDeplacement2?: string;
    horairesDeRemplacement?: string | null; // Optional field for replacement hours
    personneRemplacee?: string | null; // Optional field for the person being replaced
    dateEtHeureCreation: string;
    heuresSupplementaires?: string; // Optional field for overtime hours

    // NB: heureDebut = heureDebutAvantDepalcement, heureFin = heureFinAvantDepalcement
    // NB: heureDebut2 = heureDebutAvantDepalcement2, heureFin2 = heureFinAvantDepalcement2
    // This means that if there is no movement, the start and end times are the same as before the movement.
} 
