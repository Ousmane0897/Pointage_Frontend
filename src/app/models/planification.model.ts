export interface Planification {
    
    prenomNom: string,
    codeSecret: string;
    nomSite: string;
    siteDestination: string;
    dateDebut: string; // Date can be a string in ISO format or a Date object
    dateFin: string; // Date can be a string in ISO format or a Date object
    heureDebut: string;
    heureFin: string;
    statut:string;
    commentaires: string | null; // Optional field for comments
    dateCreation: string;
    //creePar: string;

}
