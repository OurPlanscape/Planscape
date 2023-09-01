import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { map, Subject, takeUntil } from 'rxjs';

import { AuthService } from '../services';
import { AccountDialogComponent } from '../account-dialog/account-dialog.component';
import { FeatureService } from '../features/feature.service';

@Component({
  selector: 'app-top-bar',
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.scss'],
})
export class TopBarComponent implements OnInit, OnDestroy {
  @Output()
  toggleEvent = new EventEmitter<Event>();

  displayName: string = '';

  readonly color = 'primary';

  private readonly destroy$ = new Subject<void>();

  showLogin$ = this.authService.isLoggedIn$.pipe(
    map(
      (loggedIn) => this.featureService.isFeatureEnabled('login') && !loggedIn
    )
  );

  constructor(
    private authService: AuthService,
    private dialog: MatDialog,
    private router: Router,
    private featureService: FeatureService
  ) {}

  ngOnInit(): void {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.authService.loggedInUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user) {
          this.displayName = user.firstName
            ? user.firstName
            : user.username
            ? user.username
            : '';
        } else {
          this.displayName = 'Guest';
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Opens the account management dialog. */
  openAccountDialog() {
    this.dialog.open(AccountDialogComponent);
  }

  /** Toggles the sidebar in the navigation component. */
  sendToggle(event: Event) {
    this.toggleEvent.emit(event);
  }
}
