import { Injectable } from '@angular/core';

export interface RedirectData {
  url: string;
  userHash?: string;
}

@Injectable({
  providedIn: 'root',
})
export class RedirectService {
  readonly key = 'loginRedirect';

  setRedirect(url: string, user?: string) {
    const userHash = user ? Buffer.from(user).toString('base64') : null;
    localStorage.setItem(this.key, JSON.stringify({ url, userHash }));
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
    const redirectData = localStorage.getItem(this.key);
    if (redirectData) {
      return JSON.parse(redirectData);
    }
    return null;
  }

  removeRedirect() {
    localStorage.removeItem(this.key);
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

  constructor() {}
}
