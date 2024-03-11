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

  initial$ = this.displayName$.pipe(
    map((displayName) => displayName?.substring(0, 1))
  );

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
  }

  logout() {
    this.authService.logout().subscribe((_) => {
      this.router.navigate(['/']);
    });
  }
}
