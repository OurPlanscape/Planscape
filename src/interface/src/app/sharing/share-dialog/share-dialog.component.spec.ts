import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LegacyMaterialModule } from '@material/legacy-material.module';
import { MockComponent, MockProvider } from 'ng-mocks';

import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AuthService, InvitesService, WorkspacesService } from '@services';
import { BehaviorSubject, of, take } from 'rxjs';
import { User, Workspace, WorkspaceMember } from '@types';
import {
  ShareDialogComponent as SgShareDialogComponent,
  SharePerson,
} from '@styleguide/share-dialog/share-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MOCK_PLAN } from '@services/mocks';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ShareDialogComponent } from './share-dialog.component';
import { ShareDialogData } from '../share-target';

describe('ShareDialogComponent', () => {
  let component: ShareDialogComponent;
  let fixture: ComponentFixture<ShareDialogComponent>;

  const mockInvite = {
    id: 2,
    inviter: 2,
    object_pk: 3,
    role: 'Owner',
    email: 'some@asd.com',
  };
  const inviteRow: SharePerson = {
    id: 2,
    name: 'some@asd.com',
    role: 'Viewer',
    editable: true,
  };

  const workspace: Workspace = {
    id: 5,
    name: 'My workspace',
    creator: 'Han Solo',
    created_by: 3,
    created_at: '2026-08-21T00:00:00Z',
    updated_at: '2026-08-21T00:00:00Z',
    planning_areas_count: 0,
    collaborators_count: 2,
    role: 'OWNER',
    permissions: ['view_workspace', 'add_collaborator'],
  };
  const activeMember: WorkspaceMember = {
    id: 10,
    user_id: 7,
    email: 'chewie@example.com',
    first_name: 'Chew',
    last_name: 'Bacca',
    role: 'COLLABORATOR',
    status: 'ACTIVE',
  };
  const pendingMember: WorkspaceMember = {
    id: 11,
    user_id: null,
    email: 'lando@example.com',
    first_name: '',
    last_name: '',
    role: 'VIEWER',
    status: 'PENDING',
  };

  async function setUp(data: ShareDialogData) {
    await TestBed.configureTestingModule({
      imports: [
        ShareDialogComponent,
        LegacyMaterialModule,
        MatSnackBarModule,
        NoopAnimationsModule,
        FormsModule,
      ],
      providers: [
        MockProvider(MatDialogRef),
        MockProvider(AuthService, {
          loggedInUser$: new BehaviorSubject<User | null | undefined>({
            id: 99,
            firstName: 'Joe',
            lastName: 'Smith',
          } as User),
        }),
        MockProvider(InvitesService, {
          getInvites: () => of([mockInvite]),
          inviteUsers: () => of(mockInvite),
          changeRole: () => of(mockInvite),
          deleteInvite: () => of([]),
        }),
        MockProvider(WorkspacesService, {
          getMembers: () => of([activeMember, pendingMember]),
          inviteMember: () => of(activeMember),
          updateMemberRole: () => of(activeMember),
          removeMember: () => of(undefined),
          updateInviteRole: () => of(pendingMember),
          revokeInvite: () => of(undefined),
        }),
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    })
      .overrideComponent(ShareDialogComponent, {
        remove: { imports: [SgShareDialogComponent] },
        add: { imports: [MockComponent(SgShareDialogComponent)] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ShareDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  /**
   * One synchronous read of the access list. Row actions reload it, so a
   * subscription kept open for the whole test would re-enter itself.
   */
  function rows(): SharePerson[] {
    let latest: SharePerson[] = [];
    component.people$.pipe(take(1)).subscribe((people) => (latest = people));
    return latest;
  }

  describe('sharing a planning area', () => {
    beforeEach(async () => {
      await setUp({ kind: 'plan', plan: MOCK_PLAN });
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('builds creator, you and invite rows', () => {
      const people = rows();

      expect(people.length).toBe(3);
      expect(people[1].name).toContain('(You)');
      expect(people[2]).toEqual(
        jasmine.objectContaining({ id: 2, editable: true })
      );
    });

    it('invites users with the submitted emails, role and message', () => {
      const service = TestBed.inject(InvitesService);
      spyOn(service, 'inviteUsers').and.callThrough();

      component.onPrimary({
        emails: ['john@planscape.com', 'jane@example.com'],
        role: 'Owner',
        message: 'Test message',
      });

      expect(service.inviteUsers).toHaveBeenCalledWith(
        ['john@planscape.com', 'jane@example.com'],
        'Owner',
        MOCK_PLAN.id,
        'Test message'
      );
    });

    it('closes without inviting when there are no emails', () => {
      const service = TestBed.inject(InvitesService);
      spyOn(service, 'inviteUsers');
      const closeSpy = spyOn(component, 'close');

      component.onPrimary({ emails: [], message: '' });

      expect(service.inviteUsers).not.toHaveBeenCalled();
      expect(closeSpy).toHaveBeenCalled();
    });

    it('calls changeRole with the row id and new role', () => {
      const service = TestBed.inject(InvitesService);
      spyOn(service, 'changeRole').and.returnValue(of(mockInvite));

      component.onChangeRole({ person: inviteRow, role: 'Collaborator' });

      expect(service.changeRole).toHaveBeenCalledWith(2, 'Collaborator');
    });

    it("resends using the invite's email and role", () => {
      const service = TestBed.inject(InvitesService);
      spyOn(service, 'inviteUsers').and.callThrough();
      // The snapshot the row action resolves against comes from people$.
      rows();

      component.onResend(inviteRow);

      expect(service.inviteUsers).toHaveBeenCalledWith(
        ['some@asd.com'],
        'Owner',
        MOCK_PLAN.id
      );
    });

    it('deletes the invite by id', () => {
      const service = TestBed.inject(InvitesService);
      spyOn(service, 'deleteInvite').and.returnValue(of([]));

      component.onRemoveAccess(inviteRow);

      expect(service.deleteInvite).toHaveBeenCalledWith(2);
    });
  });

  describe('sharing a workspace', () => {
    beforeEach(async () => {
      await setUp({ kind: 'workspace', workspace });
    });

    it('titles the dialog after the workspace', () => {
      expect(component.target.title).toBe('Share My workspace');
    });

    it('lists members and marks pending invites', () => {
      const people = rows();

      expect(people.length).toBe(2);
      expect(people[0]).toEqual(
        jasmine.objectContaining({
          id: 10,
          name: 'Chew Bacca',
          role: 'Collaborator',
          editable: true,
        })
      );
      expect(people[1].name).toBe('lando@example.com (Pending)');
    });

    it('invites one request per email, with the uppercased role', () => {
      const service = TestBed.inject(WorkspacesService);
      spyOn(service, 'inviteMember').and.callThrough();

      component.onPrimary({
        emails: ['john@planscape.com', 'jane@example.com'],
        role: 'Owner',
        message: 'Test message',
      });

      expect(service.inviteMember).toHaveBeenCalledTimes(2);
      expect(service.inviteMember).toHaveBeenCalledWith(
        5,
        'john@planscape.com',
        'OWNER',
        'Test message'
      );
    });

    it('changes an accepted member role by user id', () => {
      const service = TestBed.inject(WorkspacesService);
      spyOn(service, 'updateMemberRole').and.callThrough();

      component.onChangeRole({ person: rows()[0], role: 'Viewer' });

      expect(service.updateMemberRole).toHaveBeenCalledWith(5, 7, 'VIEWER');
    });

    it('changes a pending invite role by invite id', () => {
      const service = TestBed.inject(WorkspacesService);
      spyOn(service, 'updateInviteRole').and.callThrough();

      component.onChangeRole({ person: rows()[1], role: 'Owner' });

      expect(service.updateInviteRole).toHaveBeenCalledWith(5, 11, 'OWNER');
    });

    it('removes an accepted member by user id', () => {
      const service = TestBed.inject(WorkspacesService);
      spyOn(service, 'removeMember').and.callThrough();

      component.onRemoveAccess(rows()[0]);

      expect(service.removeMember).toHaveBeenCalledWith(5, 7);
    });

    it('revokes a pending invite by invite id', () => {
      const service = TestBed.inject(WorkspacesService);
      spyOn(service, 'revokeInvite').and.callThrough();

      component.onRemoveAccess(rows()[1]);

      expect(service.revokeInvite).toHaveBeenCalledWith(5, 11);
    });

    it('resends only for pending invites', () => {
      const service = TestBed.inject(WorkspacesService);
      spyOn(service, 'inviteMember').and.callThrough();
      const people = rows();

      component.onResend(people[0]);
      expect(service.inviteMember).not.toHaveBeenCalled();

      component.onResend(people[1]);
      expect(service.inviteMember).toHaveBeenCalledWith(
        5,
        'lando@example.com',
        'VIEWER'
      );
    });
  });
});
