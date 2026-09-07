import { combineLatest, filter, map, Observable, of, tap } from 'rxjs';
import { Invite, INVITE_ROLE, Plan, User } from '@types';
import { AuthService, InvitesService } from '@services';
import { SharePerson } from '@styleguide/share-dialog/share-dialog.component';
import { ShareHelpEntry, ShareTarget } from './share-target';

const ROLES: INVITE_ROLE[] = ['Viewer', 'Collaborator', 'Owner'];

const HELP: ShareHelpEntry[] = [
  {
    question: 'What can I do as an Owner?',
    answer: `Full administrative control. You can manage planning area permissions,
      and have unrestricted rights to create, edit, or delete content across all
      features.`,
  },
  {
    question: 'What can I do as a Collaborator?',
    answer: `Management access. You can create and edit, but you do not have
      permission to share access with others or delete.`,
  },
  {
    question: 'What can I do as a Viewer?',
    answer: `Read-only access to all dashboards or reports. You cannot edit,
      create, or delete data.`,
  },
];

/** Sharing a planning area, backed by the invites API. */
export class PlanShareTarget implements ShareTarget {
  readonly title: string;
  readonly roles = ROLES;
  readonly help = HELP;

  /** Latest invites, so row actions can resolve an invite by id. */
  private invitesSnapshot: Invite[] = [];

  constructor(
    private plan: Plan,
    private invitesService: InvitesService,
    private authService: AuthService
  ) {
    this.title = `Share ${plan.name}`;
  }

  people(): Observable<SharePerson[]> {
    const invites$ = this.invitesService
      .getInvites(this.plan.id)
      .pipe(tap((invites) => (this.invitesSnapshot = invites)));
    const user$ = this.authService.loggedInUser$.pipe(
      filter((user): user is User => !!user)
    );

    return combineLatest([invites$, user$]).pipe(
      map(([invites, user]) => this.buildRows(invites, user))
    );
  }

  invite(emails: string[], role: string, message: string) {
    return this.invitesService.inviteUsers(
      emails,
      (role as INVITE_ROLE) ?? ROLES[0],
      this.plan.id,
      message
    );
  }

  changeRole(person: SharePerson, role: string) {
    if (person.id == null) {
      return of(null);
    }
    return this.invitesService.changeRole(
      Number(person.id),
      role as INVITE_ROLE
    );
  }

  resend(person: SharePerson) {
    const invite = this.invitesSnapshot.find((i) => i.id === person.id);
    if (!invite) {
      return of(null);
    }
    return this.invitesService.inviteUsers(
      [invite.email],
      invite.role as INVITE_ROLE,
      this.plan.id
    );
  }

  removeAccess(person: SharePerson) {
    if (person.id == null) {
      return of(null);
    }
    return this.invitesService.deleteInvite(Number(person.id));
  }

  private buildRows(invites: Invite[], user: User): SharePerson[] {
    const rows: SharePerson[] = [];
    if (user.id != this.plan.user) {
      rows.push({
        name: this.plan.creator,
        role: 'Creator',
        editable: false,
      });
    }
    rows.push({
      name: `${[user.firstName, user.lastName].join(' ')} (You)`,
      role: this.plan.role,
      editable: false,
    });
    for (const invite of invites) {
      rows.push({
        id: invite.id,
        name: invite.collaborator_name || invite.email,
        role: invite.role,
        editable: true,
      });
    }
    return rows;
  }
}
