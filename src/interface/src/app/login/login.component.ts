import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../services';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {

  error: any;

  model: any = {};

  constructor(
    private authService: AuthService,
    private router: Router,
  ) { }

  onSubmit() {
    this.login(this.model.username, this.model.password);
  }

  login(username: string, password: string) {
    this.authService.login(username, password).subscribe(
      _ => this.router.navigate(['map']),
      error => this.error = error
    );
  }

  signup() {
    this.router.navigate(['signup']);
  }

}
