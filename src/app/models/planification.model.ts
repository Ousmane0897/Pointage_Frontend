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
    dateDemandeAnnulation?: string | null; // Date can be a string in ISO format or a Date object
    statut?: "EN_ATTENTE" | "EN_COURS" | "EXECUTEE" | "ANNULEE" | "ANNULATION_ACCEPTEE" | "ANNULATION_REFUSEE";
    commentaires: string | null; // Optional field for comments
    motifAnnulation: string | null; // Optional field for cancellation reason
    //dateAnnulation?: Date | null; // Date can be a string in ISO format or a Date object
    //demandeAnnulationPar?: string | null; // Name of the person who requested the cancellation
    //annulationValideePar?: string | null; // Name of the person who validated the cancellation
    dateCreation: Date | null;
    joursRestants?: number;
    //creePar: string;

}
