import { Component, OnInit } from '@angular/core';
import { AuthService } from '@services';
import { ActivatedRoute } from '@angular/router';
import { take } from 'rxjs';
import { CommonModule } from '@angular/common';
import { SharedModule } from '@shared';
import { AboutComponent } from '../about/about.component';

@Component({
  selector: 'app-account-validation',
  templateUrl: './account-validation.component.html',
  styleUrls: ['./account-validation.component.scss'],
  standalone: true,
  imports: [CommonModule, SharedModule, AboutComponent],
})
export class AccountValidationComponent implements OnInit {
  protected isValidated = false;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // all we care about here is the isValidated value
    this.checkValidation();
  }

  checkValidation(): void {
    // TODO: here, we're only handling two cases: valid or invalid token
    // However, we could consider handling a found but expired token differenly
    const validationToken = this.route.snapshot.paramMap.get('token');
    this.authService
      .validateAccount(validationToken!)
      .pipe(take(1))
      .subscribe((res) => {
        this.isValidated = res;
      });
  }
}
