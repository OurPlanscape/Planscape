import { Component, OnInit } from '@angular/core';
import { concatMap, Observable, of } from 'rxjs';

import { AuthService, User } from './../auth.service';

@Component({
  selector: 'app-account-dialog',
  templateUrl: './account-dialog.component.html',
  styleUrls: ['./account-dialog.component.scss']
})
export class AccountDialogComponent implements OnInit {

  user$: Observable<User> = this.authService.isLoggedIn$.pipe(concatMap(loggedIn => {
    return loggedIn ? this.authService.getLoggedInUser() : of({ username: 'Guest' });
  }));

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
  }

}
