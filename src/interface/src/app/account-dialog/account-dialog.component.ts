import { Component, OnInit } from '@angular/core';
import { concatMap, Observable, of } from 'rxjs';

import { AuthService } from './../auth.service';

@Component({
  selector: 'app-account-dialog',
  templateUrl: './account-dialog.component.html',
  styleUrls: ['./account-dialog.component.scss']
})
export class AccountDialogComponent implements OnInit {

  user$: Observable<any> = this.authService.isLoggedIn$.pipe(concatMap(result => {
    return result ? this.authService.getLoggedInUser() : of({ username: 'Guest' });
  }));

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
  }

}
