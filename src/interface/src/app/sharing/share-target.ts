import { Observable } from 'rxjs';
import { Plan, Workspace } from '@types';
import { SharePerson } from '@styleguide/share-dialog/share-dialog.component';

/** What the share modal is opened for. */
export type ShareDialogData =
  | { kind: 'plan'; plan: Plan }
  | { kind: 'workspace'; workspace: Workspace };

/** A question and answer in the dialog's help panel. */
export interface ShareHelpEntry {
  question: string;
  answer: string;
}

/**
 * Everything the share modal needs to know about the thing being shared, so
 * the dialog itself stays the same for planning areas and workspaces. One
 * implementation per shareable entity; see `ShareTargetFactory`.
 *
 * Roles are the labels shown in the dropdowns — implementations translate to
 * whatever their API expects.
 */
export interface ShareTarget {
  title: string;
  roles: string[];
  help: ShareHelpEntry[];
  /** The access list. Re-read every time the dialog reloads. */
  people(): Observable<SharePerson[]>;
  invite(emails: string[], role: string, message: string): Observable<unknown>;
  changeRole(person: SharePerson, role: string): Observable<unknown>;
  resend(person: SharePerson): Observable<unknown>;
  removeAccess(person: SharePerson): Observable<unknown>;
}
