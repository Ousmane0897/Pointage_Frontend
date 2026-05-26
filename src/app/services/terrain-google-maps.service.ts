import { Injectable } from '@angular/core';
import { Loader } from '@googlemaps/js-api-loader';
import { environment } from '../../environments/environment';

/**
 * Service de chargement de l'API Google Maps — Module Exploitation Terrain (5.2).
 *
 * Singleton qui mémorise le Loader afin d'éviter de recharger le SDK Google
 * Maps à chaque ouverture d'un composant carte. Les composants `carte-google`
 * appellent `load()` puis utilisent l'objet `google.maps` global.
 */
@Injectable({ providedIn: 'root' })
export class TerrainGoogleMapsService {

  private loader: Loader | null = null;
  private loadPromise: Promise<typeof google> | null = null;

  /**
   * Charge l'API Google Maps une seule fois. Retourne le namespace `google`
   * directement utilisable (création de cartes, marqueurs, etc.).
   *
   * Lance une erreur si la clé API n'est pas configurée dans environment.ts.
   */
  load(): Promise<typeof google> {
    if (!environment.googleMapsApiKey) {
      return Promise.reject(
        new Error(
          'Clé API Google Maps manquante. Renseignez `googleMapsApiKey` dans environment.ts.',
        ),
      );
    }
    if (this.loadPromise) {
      return this.loadPromise;
    }
    this.loader ??= new Loader({
      apiKey: environment.googleMapsApiKey,
      version: 'weekly',
      libraries: ['places', 'marker'],
      language: 'fr',
      region: 'SN',
    });
    this.loadPromise = this.loader.load();
    return this.loadPromise;
  }
}
