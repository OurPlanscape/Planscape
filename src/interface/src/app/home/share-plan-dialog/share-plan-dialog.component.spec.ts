import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharePlanDialogComponent } from './share-plan-dialog.component';
import { LegacyMaterialModule } from '@material/legacy-material.module';
import { MockComponent, MockProvider } from 'ng-mocks';

import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AuthService, InvitesService } from '@services';
import { BehaviorSubject, of } from 'rxjs';
import { Plan, User } from '@types';
import {
  ShareDialogComponent,
  SharePerson,
} from '@styleguide/share-dialog/share-dialog.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { PlanState } from '@plan/plan.state';
import { MOCK_PLAN } from '@services/mocks';
import { MatSnackBarModule } from '@angular/material/snack-bar';

describe('SharePlanDialogComponent', () => {
  let component: SharePlanDialogComponent;
  let fixture: ComponentFixture<SharePlanDialogComponent>;
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

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        SharePlanDialogComponent,
        MockComponent(ShareDialogComponent),
      ],
      imports: [
        LegacyMaterialModule,
        MatSnackBarModule,
        NoopAnimationsModule,
        FormsModule,
      ],
      providers: [
        MockProvider(PlanState, {
          currentPlan$: of({} as Plan),
        }),
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
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            plan: MOCK_PLAN,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SharePlanDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('people$', () => {
    it('builds creator, you and invite rows', (done) => {
      component.people$.subscribe((rows) => {
        expect(rows.length).toBe(3);
        expect(rows[1].name).toContain('(You)');
        expect(rows[2]).toEqual(
          jasmine.objectContaining({ id: 2, editable: true })
        );
        done();
      });
    });
  });

  describe('onPrimary', () => {
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
  });

  describe('onChangeRole', () => {
    it('calls changeRole with the row id and new role', () => {
      const service = TestBed.inject(InvitesService);
      spyOn(service, 'changeRole').and.returnValue(of(mockInvite));

      component.onChangeRole({ person: inviteRow, role: 'Collaborator' });

      expect(service.changeRole).toHaveBeenCalledWith(2, 'Collaborator');
    });
  });

  describe('onResend', () => {
    it("re-invites using the invite's email and role", () => {
      const service = TestBed.inject(InvitesService);
      spyOn(service, 'inviteUsers').and.callThrough();

      component.onResend(inviteRow);

      expect(service.inviteUsers).toHaveBeenCalledWith(
        ['some@asd.com'],
        'Owner',
        MOCK_PLAN.id
      );
    });
  });

  describe('onRemoveAccess', () => {
    it('deletes the invite by id', () => {
      const service = TestBed.inject(InvitesService);
      spyOn(service, 'deleteInvite').and.returnValue(of([]));

      component.onRemoveAccess(inviteRow);

      expect(service.deleteInvite).toHaveBeenCalledWith(2);
    });
  });
});
