export interface Planification {

    id?: string;
    prenomNom: string,
    codeSecret: string;
    nomSite: string;
    siteDestination: string[];
    personneRemplacee: string;
    dateDebut: Date | null; // Date can be a string in ISO format or a Date object
    dateFin: Date | null; // Date can be a string in ISO format or a Date object
    matin?: boolean; // Indicates if the planning hour is for the morning
    apresMidi?: boolean; // Indicates if the planning hour is for the afternoon
    heureDebut: string;
    heureFin: string;
    statut?: "EN_ATTENTE" | "EN_COURS" | "EXECUTEE" | "ANNULEE";
    commentaires: string | null; // Optional field for comments
    motifAnnulation: string | null; // Optional field for cancellation reason
    dateCreation: Date | null;
    joursRestants?: number;
    //creePar: string;

}
