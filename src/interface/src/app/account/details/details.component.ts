import { Component } from '@angular/core';
import { AuthService } from '@services';
import { FormMessageType } from '@types';

@Component({
  selector: 'app-details',
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss'],
})
export class DetailsComponent {
  user$ = this.authService.loggedInUser$;
  successMsg: string | null = null;
  errorMsg: string | null = null;

  readonly FormMessageType = FormMessageType;

  constructor(private authService: AuthService) {}
}
