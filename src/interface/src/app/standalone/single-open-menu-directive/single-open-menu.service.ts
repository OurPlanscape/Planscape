import { Injectable } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';

@Injectable({ providedIn: 'root' })
export class SingleOpenMenuService {
  private openTrigger: MatMenuTrigger | null = null;

  opened(trigger: MatMenuTrigger) {
    if (this.openTrigger && this.openTrigger !== trigger) {
      this.openTrigger.closeMenu();
    }
    this.openTrigger = trigger;
  }

  closed(trigger: MatMenuTrigger) {
    if (this.openTrigger === trigger) {
      this.openTrigger = null;
    }
  }
}
