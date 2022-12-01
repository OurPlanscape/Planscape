import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

import { AuthService } from '../services';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit, OnDestroy {
  @Input()
  sidebarOpen = false;

  isLoggedIn$: Observable<boolean> = this.authService.isLoggedIn$;

  private isLoggedInSubscription!: Subscription;

  constructor(
    private authService: AuthService) {}

  ngOnInit() {
    this.isLoggedInSubscription = this.authService.isLoggedIn$.subscribe();
  }

  ngOnDestroy(): void {
    this.isLoggedInSubscription.unsubscribe();
  }

  logout() {
    this.authService.logout().subscribe();
  }

}
