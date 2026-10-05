import {
  combineLatest,
  EMPTY,
  filter,
  forkJoin,
  map,
  Observable,
  tap,
} from 'rxjs';
import { User, Workspace, WorkspaceMember, WorkspaceRole } from '@types';
import { AuthService, WorkspacesService } from '@services';
import { SharePerson } from '@styleguide/share-dialog/share-dialog.component';
import { ShareHelpEntry, ShareTarget } from './share-target';

const ROLES = ['Viewer', 'Collaborator', 'Owner'];

const HELP: ShareHelpEntry[] = [
  {
    question: 'What can I do as an Owner?',
    answer: `Full administrative control. You can manage workspace members, and
      have unrestricted rights to create, edit, or delete planning areas in the
      workspace.`,
  },
  {
    question: 'What can I do as a Collaborator?',
    answer: `Management access. You can create planning areas in the workspace,
      but you cannot rename or delete it, or share access with others.`,
  },
  {
    question: 'What can I do as a Viewer?',
    answer: `Read-only access to the workspace and its planning areas. You
      cannot create, edit, or delete anything.`,
  },
];

const toApiRole = (role: string) => role.toUpperCase() as WorkspaceRole;

const toDisplayRole = (role: WorkspaceRole) =>
  role.charAt(0) + role.slice(1).toLowerCase();

/** Sharing a workspace, backed by the workspace members API. */
export class WorkspaceShareTarget implements ShareTarget {
  readonly title: string;
  readonly roles = ROLES;
  readonly help = HELP;

  /** Latest roster, so row actions can resolve a member by row id. */
  private membersSnapshot: WorkspaceMember[] = [];

  constructor(
    private workspace: Workspace,
    private workspacesService: WorkspacesService,
    private authService: AuthService
  ) {
    this.title = `Share ${workspace.name}`;
  }

  people(): Observable<SharePerson[]> {
    const members$ = this.workspacesService
      .getMembers(this.workspace.id)
      .pipe(tap((members) => (this.membersSnapshot = members)));
    const user$ = this.authService.loggedInUser$.pipe(
      filter((user): user is User => !!user)
    );

    return combineLatest([members$, user$]).pipe(
      map(([members, user]) => this.buildRows(members, user))
    );
  }

  /** The API takes a single email, so a batch invite fans out. */
  invite(emails: string[], role: string, message: string) {
    const apiRole = toApiRole(role || ROLES[0]);
    return forkJoin(
      emails.map((email) =>
        this.workspacesService.inviteMember(
          this.workspace.id,
          email,
          apiRole,
          message
        )
      )
    );
  }

  changeRole(person: SharePerson, role: string) {
    const member = this.memberOf(person);
    if (!member) {
      return EMPTY;
    }
    const apiRole = toApiRole(role);
    return member.status === 'PENDING'
      ? this.workspacesService.updateInviteRole(
          this.workspace.id,
          member.id,
          apiRole
        )
      : this.workspacesService.updateMemberRole(
          this.workspace.id,
          member.user_id as number,
          apiRole
        );
  }

  /** Re-sends the invitation email. Only pending invites have one. */
  resend(person: SharePerson) {
    const member = this.memberOf(person);
    if (!member || member.status !== 'PENDING') {
      return EMPTY;
    }
    return this.workspacesService.inviteMember(
      this.workspace.id,
      member.email,
      member.role
    );
  }

  removeAccess(person: SharePerson) {
    const member = this.memberOf(person);
    if (!member) {
      return EMPTY;
    }
    return member.status === 'PENDING'
      ? this.workspacesService.revokeInvite(this.workspace.id, member.id)
      : this.workspacesService.removeMember(
          this.workspace.id,
          member.user_id as number
        );
  }

  private memberOf(person: SharePerson) {
    return this.membersSnapshot.find((member) => member.id === person.id);
  }

  private buildRows(members: WorkspaceMember[], user: User): SharePerson[] {
    const creator = members.find(
      (member) => member.user_id === this.workspace.created_by
    );
    const self = members.find((member) => member.user_id === user.id);
    const rows: SharePerson[] = [];

    // The creator's role can be neither changed nor revoked, and their name is
    // a snapshot on the workspace that outlives their membership.
    if (creator && creator !== self) {
      rows.push({
        name: this.workspace.creator,
        role: 'Creator',
        editable: false,
      });
    }
    if (self) {
      rows.push({
        name: `${[user.firstName, user.lastName].join(' ')} (You)`,
        role: self === creator ? 'Creator' : toDisplayRole(self.role),
        editable: false,
      });
    }
    for (const member of members) {
      if (member === creator || member === self) {
        continue;
      }
      rows.push({
        id: member.id,
        name: this.displayName(member),
        role: toDisplayRole(member.role),
        editable: true,
      });
    }
    return rows;
  }

  private displayName(member: WorkspaceMember): string {
    if (member.status === 'PENDING') {
      return `${member.email} (Pending)`;
    }
    return (
      [member.first_name, member.last_name].filter(Boolean).join(' ') ||
      member.email
    );
  }
}
