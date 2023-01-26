import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthService, User } from '../services';

@Component({
  selector: 'app-account-dialog',
  templateUrl: './account-dialog.component.html',
  styleUrls: ['./account-dialog.component.scss'],
})
export class AccountDialogComponent implements OnInit {
  user$!: Observable<User | null>;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.user$ = this.authService.loggedInUser$;
  }
}
