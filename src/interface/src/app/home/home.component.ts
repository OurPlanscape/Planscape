import { Observable, map, of, Subscription, tap, concatMap } from 'rxjs';
import { Component, OnInit } from '@angular/core';

import { AuthService } from './../auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  user$: Observable<any> = this.authService.isLoggedIn$.pipe(concatMap(result => {
    return result ? this.authService.getLoggedInUser() : of({ username: 'Guest' });
  }));

  constructor(private authService: AuthService) { }

  ngOnInit(): void {
  }

}
