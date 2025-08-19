export interface JwtPayload {
  sub: string;         // Subject (usually the user ID or username)
  prenom: string;      // First name of the user
  nom: string;         // Last name of the user
  poste: string;       // Job position of the user
  iat?: number;        // Issued at (timestamp, optional)
  exp?: number;        // Expiration time (timestamp, optional)
  role?: string;       // Custom claim for user role
  [key: string]: any;  // Makes the interface open to other fields (optional claims, etc.)
}
