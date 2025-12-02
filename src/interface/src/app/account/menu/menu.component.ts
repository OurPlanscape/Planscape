import { Component } from '@angular/core';
import { AuthService } from '@services';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
})
export class MenuComponent {
  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  // ERROR_SURVEY - no error handling, just redirects user after call
  logout() {
    this.authService.logout().subscribe((_) => {
      this.router.navigate(['/']);
    });
  }

  currentUrl = this.route.snapshot.firstChild?.url;

  isSelected(item: string) {
    return this.currentUrl && this.currentUrl.toString() === item;
  }
}
