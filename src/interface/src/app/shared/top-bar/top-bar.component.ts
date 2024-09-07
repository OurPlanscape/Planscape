import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { map, switchMap } from 'rxjs';

import { AuthService } from '@services';

@Component({
  selector: 'app-top-bar',
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.scss'],
})
export class TopBarComponent implements OnInit {
  @Output()
  toggleEvent = new EventEmitter<Event>();

  sidebarOpen = false;

  readonly color = 'primary';

  loggedIn$ = this.authService.isLoggedIn$;

  displayName$ = this.loggedIn$.pipe(
    switchMap((loggedIn) => this.authService.loggedInUser$),
    map((user) => {
      if (user === undefined) {
        return;
      }

      if (user) {
        return user.firstName || user.username;
      } else {
        return 'Sign In';
      }
    })
  );

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.router.events.subscribe((event) => {
      this.sidebarOpen = false;
      this.removeBodyClass();
    });
  }

  logout() {
    this.authService.logout().subscribe((_) => {
      this.router.navigate(['/']);
    });
  }

  toggleSidePanel() {
    if (this.sidebarOpen) {
      this.removeBodyClass();
    } else {
      this.addBodyClass();
    }

    this.sidebarOpen = !this.sidebarOpen;
  }

  /**
   * when showing the mobile menu, we want to avoid the scroll bounce of the main body
   */
  addBodyClass() {
    const bodyTag = document.body;
    bodyTag.classList.add('no-scroll-bounce');
  }

  /**
   * When the menu is closed we can remove the class that disables the scroll bounce
   */
  removeBodyClass() {
    const bodyTag = document.body;
    bodyTag.classList.remove('no-scroll-bounce');
  }
}
