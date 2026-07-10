import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { FormMessageType } from '@types';
import { SharedModule } from '@shared';
import { ButtonComponent } from '@styleguide';
import { ChipInputComponent } from '@home/chip-input/chip-input.component';

/**
 * Share modal chrome shared by the plan-share and funding-report-share dialogs.
 * It owns the email entry behaviour (adding, basic validation via the chip
 * input, removing chips and the invalid-email banner) and emits the resulting
 * list through `emailsChange` so hosts only need to react to the final emails.
 *
 * The parts that differ between the two dialogs are supplied through
 * content-projection slots:
 * - `[shareDialogRoleSelector]` — role dropdown next to the chip input (plan only)
 * - `[shareDialogMessage]` — message textarea, shown while composing (plan only)
 * - `[shareDialogBody]` — the variable list (people-with-access / report-sent-to)
 * - `[shareDialogHelp]` — help panel, shown when the header help button is toggled
 */
@Component({
  selector: 'app-share-dialog',
  standalone: true,
  imports: [
    CommonModule,
    SharedModule,
    ChipInputComponent,
    ButtonComponent,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './share-dialog.component.html',
  styleUrls: ['./share-dialog.component.scss'],
})
export class ShareDialogComponent {
  @Input() title = '';
  @Input() emails: string[] = [];
  @Input() placeholder = 'enter email';
  @Input() submitting = false;
  @Input() primaryLabel = 'Send';
  @Input() primaryDisabled = false;
  @Input() showCopyLink = false;
  @Input() showHelpButton = false;
  @Input() twoColumnForm = false;
  /** Show a back button that clears the entered emails while composing (plan share). */
  @Input() allowStartOver = false;
  /** Hide the projected body (e.g. the people-with-access list) while composing emails. */
  @Input() hideBodyWhileComposing = false;

  @Output() emailsChange = new EventEmitter<string[]>();
  @Output() primaryAction = new EventEmitter<void>();
  @Output() copyLink = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
  @Output() helpClicked = new EventEmitter<void>();

  errorType = FormMessageType.ERROR;
  showHelp = false;
  invalidEmail = false;

  /**
   * True once the user starts entering emails (or hits an invalid one), which
   * switches the dialog from the read-only list to the compose view.
   */
  get showMessageBox(): boolean {
    return this.invalidEmail || this.emails.length > 0;
  }

  get showBody(): boolean {
    return !this.hideBodyWhileComposing || !this.showMessageBox;
  }

  addEmail(email: string): void {
    this.emails = [...this.emails, email];
    this.emailsChange.emit(this.emails);
  }

  removeEmail(email: string): void {
    const index = this.emails.indexOf(email);
    if (index < 0) {
      return;
    }
    this.emails = this.emails.filter((_, i) => i !== index);
    this.emailsChange.emit(this.emails);
  }

  setInvalidEmail(invalid: boolean): void {
    this.invalidEmail = invalid;
  }

  startOver(): void {
    this.emails = [];
    this.invalidEmail = false;
    this.emailsChange.emit(this.emails);
  }

  openHelp(): void {
    this.showHelp = true;
    this.helpClicked.emit();
  }
}
