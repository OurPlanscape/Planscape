import { Component, OnInit, OnDestroy } from '@angular/core';
import { concatMap, Observable, of, Subscription } from 'rxjs';

import { AuthService, User } from './../auth.service';

@Component({
  selector: 'app-account-dialog',
  templateUrl: './account-dialog.component.html',
  styleUrls: ['./account-dialog.component.scss']
})
export class AccountDialogComponent implements OnInit, OnDestroy {

  user$!: Observable<User>;

  private isLoggedInSubscription!: Subscription;

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
    this.isLoggedInSubscription = this.authService.isLoggedIn$.subscribe();
    this.user$ = this.authService.isLoggedIn$.pipe(concatMap(loggedIn => {
      return loggedIn ? this.authService.getLoggedInUser() : of({ username: 'Guest' });
    }));
  }

  ngOnDestroy(): void {
    this.isLoggedInSubscription.unsubscribe();
  }

}
