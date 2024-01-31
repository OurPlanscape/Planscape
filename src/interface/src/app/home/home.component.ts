import { Component } from '@angular/core';
import { AuthService } from '../services';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  loggedIn$ = this.authService.loggedInStatus$;

  constructor(private authService: AuthService) {}
}
