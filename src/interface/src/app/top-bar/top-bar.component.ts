import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';

import { AccountDialogComponent } from './../account-dialog/account-dialog.component';
import { Region, RegionOption, regionOptions } from '../types';
import { SessionService } from '../session.service';

@Component({
  selector: 'top-bar',
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.scss'],
})
export class TopBarComponent implements OnInit {
  @Output()
  toggleEvent = new EventEmitter<Event>();

  readonly color = 'primary';
  readonly regionOptions: RegionOption[] = regionOptions;
  readonly selectedRegion$ = this.sessionService.region$;

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private sessionService: SessionService,
    ) {}

  ngOnInit(): void {}

  /** Opens the account management dialog. */
  openAccountDialog() {
    this.dialog.open(AccountDialogComponent);
  }

  /** Toggles the sidebar in the navigation component. */
  sendToggle(event: Event) {
    this.toggleEvent.emit(event);
  }

  /** Sets the region from the dropdown and goes to the map. */
  setRegion(event: Event) {
    // The built-in type for event is generic, so it needs to be cast
    const region = (event.target as HTMLSelectElement).value as Region;
    this.sessionService.setRegion(region);
    this.router.navigateByUrl('/map');
  }

}
