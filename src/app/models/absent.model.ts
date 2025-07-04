export interface Absent {
    codeSecret: string;
    prenom: string;
    nom: string;
    numero: string;
    dateAbsence: string; // Changed to Date type for consistenc
    motif: string; // 'maladie' | 'congé' | 'autre'
    justification: string;
    intervention: string;
    site: string;

}