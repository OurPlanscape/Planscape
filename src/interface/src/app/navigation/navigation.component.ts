import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { AuthService } from '../services';

export interface SidenavLink {
  text: string;
  href: string;
  icon: string;
}

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit, OnDestroy {
  @Input() sidebarOpen = false;

  sidenavLinks: SidenavLink[] = [
    {
      text: "Home",
      href: "/home",
      icon: "home",
    },
    {
      text: "Explore",
      href: "/map",
      icon: "explore",
    },
  ]
  isLoggedIn$: Observable<boolean> = this.authService.isLoggedIn$;

  private isLoggedInSubscription!: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    ) {}

  ngOnInit() {
    this.isLoggedInSubscription = this.authService.isLoggedIn$.subscribe();
  }

  ngOnDestroy(): void {
    this.isLoggedInSubscription.unsubscribe();
  }

  logout() {
    this.authService.logout().subscribe();
  }

  isSelected(path: string) {
    return this.router.url === path;
  }
}
