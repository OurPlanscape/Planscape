import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ButtonComponent } from '../button/button.component';
import { BannerComponent } from '../banner/banner.component';
import { ChipInputComponent } from '../chip-input/chip-input.component';

/** A person in the access list when the dialog shows roles. */
export interface SharePerson {
  /** Stable id (e.g. invite id) so the host can act on the row. */
  id?: number | string;
  name: string;
  role: string;
  /** When true (and the dialog shows roles), the role is editable via a dropdown. */
  editable?: boolean;
}

/** Emitted when an editable person's role is changed from the list. */
export interface RoleChange {
  person: SharePerson;
  role: string;
}

/** Payload of the primary (Invite / Send) action. */
export interface SharePrimaryEvent {
  emails: string[];
  /** The batch role for the invite (when the dialog shows roles). */
  role?: string;
  message: string;
}

/**
 * Share modal chrome shared by share flows (plan share, funding-report share).
 * It owns the email entry behaviour (adding, basic validation via the chip
 * input, removing chips and the invalid-email banner) and emits the resulting
 * list through `emailsChange` so hosts only react to the final emails.
 *
 * Roles, the access list and the message box are driven by inputs (`showRoles`,
 * `roles`, `people`, `showMessage`). The help panel is the last content-projection
 * slot: `[shareDialogHelp]`, shown when the header help button is toggled.
 */
@Component({
  selector: 'sg-share-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChipInputComponent,
    BannerComponent,
    ButtonComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './share-dialog.component.html',
  styleUrls: ['./share-dialog.component.scss'],
})
export class ShareDialogComponent implements OnChanges {
  @Input() title = '';
  @Input() emails: string[] = [];
  @Input() placeholder = 'enter email';
  @Input() submitting = false;
  /** Primary button label when there are emails to submit (e.g. "Invite"). */
  @Input() primaryLabel = 'Send';
  /** Optional label when no emails are entered (e.g. "Done"); falls back to primaryLabel. */
  @Input() idleLabel?: string;
  @Input() primaryDisabled = false;
  @Input() showCopyLink = false;
  @Input() showHelpButton = false;

  /**
   * The access list. When the dialog shows roles, pass `{ name, role }[]` — each
   * row renders a role dropdown to update it. Otherwise pass `string[]` — each
   * row is a plain name/email.
   */
  @Input() people: string[] | SharePerson[] = [];
  @Input() peopleLabel = '';
  @Input() peopleEmptyText?: string;
  /** Show a spinner in place of the list while it loads. */
  @Input() peopleLoading = false;
  /**
   * Whether the dialog deals in roles: renders the batch role selector next to
   * the chip input (for outgoing invites) and role dropdowns in the list.
   */
  @Input() showRoles = false;
  @Input() roles: string[] = [];
  /** Show a message textarea while composing (included with the invite). */
  @Input() showMessage = false;
  /** Show a back button that clears the entered emails while composing. */
  @Input() allowStartOver = false;
  /** Hide the projected body (e.g. the people list) while composing emails. */
  @Input() hideBodyWhileComposing = false;

  @Output() emailsChange = new EventEmitter<string[]>();
  @Output() primaryAction = new EventEmitter<SharePrimaryEvent>();
  @Output() copyLink = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();
  @Output() helpClicked = new EventEmitter<void>();
  @Output() roleChange = new EventEmitter<RoleChange>();
  @Output() resend = new EventEmitter<SharePerson>();
  @Output() removeAccess = new EventEmitter<SharePerson>();

  showHelp = false;
  invalidEmail = false;
  message = '';
  /** The role applied to newly-invited emails; seeded from the first role. */
  selectedRole?: string;

  ngOnChanges(): void {
    if (!this.selectedRole && this.roles.length) {
      this.selectedRole = this.roles[0];
    }
  }

  selectRole(role: string): void {
    this.selectedRole = role;
  }

  emitPrimary(): void {
    this.primaryAction.emit({
      emails: this.emails,
      role: this.selectedRole,
      message: this.message,
    });
  }

  /** Optimistically update the row's role, then let the host persist it. */
  changePersonRole(person: SharePerson, role: string): void {
    person.role = role;
    this.roleChange.emit({ person, role });
  }

  /** Normalize `string[]` / `{ name, role }[]` into a single row shape. */
  get peopleRows(): SharePerson[] {
    return (this.people as Array<string | SharePerson>).map((person) =>
      typeof person === 'string' ? { name: person, role: '' } : person
    );
  }

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

  /** "Invite" once emails are entered, otherwise the idle label (e.g. "Done"). */
  get displayLabel(): string {
    return this.emails.length > 0
      ? this.primaryLabel
      : (this.idleLabel ?? this.primaryLabel);
  }

  /**
   * Disabled while submitting, when the host disables it, or when there's
   * nothing to submit and no idle action (e.g. funding's "Send" before an email
   * is entered — plan's "Done" stays enabled because it has an idle label).
   */
  get primaryButtonDisabled(): boolean {
    return (
      this.submitting ||
      this.primaryDisabled ||
      (this.emails.length === 0 && !this.idleLabel)
    );
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
