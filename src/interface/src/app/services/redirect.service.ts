import { Injectable } from '@angular/core';
import { LoginRedirectStorageService } from '@services/local-storage.service';

export interface RedirectData {
  url: string;
  userHash: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class RedirectService {
  constructor(
    private loginRedirectStorageService: LoginRedirectStorageService
  ) {}

  setRedirect(url: string, user?: string) {
    const userHash = user ? Buffer.from(user).toString('base64') : null;
    this.loginRedirectStorageService.setItem({ url, userHash });
  }

  private getUrl(): string | null {
    const redirectData = this.getRedirectData();
    if (redirectData) {
      return redirectData.url;
    }
    return null;
  }

  private getEmail(): string | null {
    const redirectData = this.getRedirectData();
    if (redirectData && redirectData.userHash) {
      return Buffer.from(redirectData.userHash, 'base64').toString('utf-8');
    }
    return null;
  }

  private getRedirectData(): RedirectData | null {
    return this.loginRedirectStorageService.getItem();
  }

  removeRedirect() {
    this.loginRedirectStorageService.removeItem();
  }

  shouldRedirect(userEmail: string) {
    const savedEmail = this.getEmail();
    const savedUrl = this.getUrl();
    // if we have a user stored, we need to check it's the same as the email provided.
    if (savedEmail && savedEmail !== userEmail) {
      return false;
    }
    return savedUrl || false;
  }
}
