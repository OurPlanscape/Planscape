import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { AuthService } from '../services';
import { AccountDialogComponent } from '../account-dialog/account-dialog.component';

@Component({
  selector: 'app-top-bar',
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.scss'],
})
export class TopBarComponent implements OnInit, OnDestroy {
  @Output()
  toggleEvent = new EventEmitter<Event>();

  // display name is first name and then username
  displayName: string = '';
  loggedIn = false;

  readonly color = 'primary';

  private readonly destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private dialog: MatDialog,
    private router: Router
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
          this.loggedIn = true;
        } else {
          this.displayName = 'Guest';
          this.loggedIn = false;
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
