import { Component } from '@angular/core';
import { AuthService } from '../../services';

@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss'],
})
export class DetailsComponent {
  user$ = this.authService.loggedInUser$;
  successMsg: string | null = null;

  constructor(private authService: AuthService) {}
}
