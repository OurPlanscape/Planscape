import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { Observable, of } from 'rxjs';
import { Router, UrlTree } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class DevelopmentRouteGuard {
  constructor(private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    const isLocalhost = window.location.hostname === 'localhost';
    const isDevelopment = environment.environment === 'development';

    return of(
      isLocalhost || isDevelopment ? true : this.router.parseUrl('/home')
    );
  }
}
