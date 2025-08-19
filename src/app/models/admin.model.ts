export interface Admin {
    identifiant: string;    
    nom: string; 
    prenom: string;  
    email: string; 
    password: string; 
    poste: string;
    role: string;
    motifDesactivation: string;
    active: boolean; 
}