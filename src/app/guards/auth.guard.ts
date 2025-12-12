import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { LoginService } from '../services/login.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private loginService: LoginService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {

    const isLoggedIn = this.loginService.isLoggedIn();
    const mustChangePassword = this.loginService.getMustChangePassword(); // À ajouter dans LoginService
    const url = state.url;

    console.log("🔐 AuthGuard check → url:", url);
    console.log("   isLoggedIn =", isLoggedIn);
    console.log("   mustChangePassword =", mustChangePassword);

    // --------------------------------------------------------------------
    // 1️⃣ Routes que le guard NE DOIT JAMAIS bloquer
    // --------------------------------------------------------------------
    if (
      url === '/super-admin-login' ||
      url === '/change-password'
    ) {
      return true;
    }

    // --------------------------------------------------------------------
    // 2️⃣ Si utilisateur NON connecté → redirection login
    // --------------------------------------------------------------------
    if (!isLoggedIn) {
      console.log("⚠️ Pas connecté → redirection vers /super-admin-login");
      this.router.navigate(['/super-admin-login']);
      return false;
    }

    // --------------------------------------------------------------------
    // 3️⃣ Si l'utilisateur doit changer son mot de passe
    // --------------------------------------------------------------------
    if (mustChangePassword && url !== '/change-password') {
      console.log("🔒 Première connexion → redirection vers /change-password");
      this.router.navigate(['/change-password']);
      return false;
    }

    // --------------------------------------------------------------------
    // 4️⃣ Sinon → accès autorisé
    // --------------------------------------------------------------------
    return true;
  }
}
