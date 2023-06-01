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

import { AuthService, SessionService } from '../services';
import { Region, RegionOption, regionOptions } from '../types';
import { AccountDialogComponent } from './../account-dialog/account-dialog.component';

@Component({
  selector: 'top-bar',
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.scss'],
})
export class TopBarComponent implements OnInit, OnDestroy {
  @Output()
  toggleEvent = new EventEmitter<Event>();

  displayName: string = '';

  readonly color = 'primary';
  readonly regionOptions: RegionOption[] = regionOptions;
  readonly selectedRegion$ = this.sessionService.region$;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private dialog: MatDialog,
    private router: Router,
    private sessionService: SessionService
  ) {}

  ngOnInit(): void {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.authService.loggedInUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user) {
          this.displayName = user.firstName ? user.firstName : (user.username ? user.username : '');
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
  
  /** Loads map page */
  loadMap() {
    window.location.assign('/map');
  }

  /** Reloads page */
  reloadPage(){
    window.location.reload();
  }

  /** Sets the region from the dropdown and goes to the map. */
  setRegion(event: Event) {
    // The built-in type for event is generic, so it needs to be cast
    const region = (event.target as HTMLSelectElement).value as Region;
    this.sessionService.setRegion(region);  
    if(this.router.url == '/home'){
      this.loadMap();
      // this.router.navigateByUrl or navigate does not re-initialize map
    }
    else{
      this.reloadPage();
    }
  }
}
