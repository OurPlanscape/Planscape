import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { AccountDialogComponent } from './../account-dialog/account-dialog.component';

@Component({
  selector: 'top-bar',
  templateUrl: './top-bar.component.html',
  styleUrls: ['./top-bar.component.scss']
})
export class TopBarComponent implements OnInit {
  @Output()
  toggleEvent = new EventEmitter<Event>();

  readonly color = 'primary';

  constructor(private dialog: MatDialog) {}

  ngOnInit(): void {}

  /** Opens the account management dialog. */
  openAccountDialog() {
    this.dialog.open(AccountDialogComponent);
  }

  /** Toggles the sidebar in the navigation component. */
  sendToggle(event: Event) {
    this.toggleEvent.emit(event);
  }

}
