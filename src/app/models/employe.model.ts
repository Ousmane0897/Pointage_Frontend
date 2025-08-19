export interface Employe {
    codeSecret: string;
    nom: string;
    prenom: string;
    numero: string;
    intervention: string;
    statut: string;
    employeCreePar: string | null; 
    site: string[]; // Assuming site is an array of strings
    joursDeTravail: string;
    joursDeTravail2?: string;
    deplacement: boolean;
    heureDebut: string;
    heureFin: string;
    heureDebut2?: string; // Optional field for additional start time
    heureFin2?: string; // Optional field for additional end time
    dateEtHeureCreation: string;

} 
