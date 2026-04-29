import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharePlanDialogComponent } from './share-plan-dialog.component';
import { LegacyMaterialModule } from '@material/legacy-material.module';
import { MockComponents, MockProvider } from 'ng-mocks';

import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AuthService } from '@services';
import { InvitesService } from '@app/api/generated/invites/invites.service';
import { RoleEnum } from '@app/api/generated/planscapeAPI.schemas';
import { BehaviorSubject, of } from 'rxjs';
import { Plan, User } from '@types';
import { ChipInputComponent } from '@home/chip-input/chip-input.component';
import { SectionLoaderComponent } from '@shared';
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
    content_type: 1,
    role: RoleEnum.Owner,
    email: 'some@asd.com',
    collaborator: 0,
    collaborator_name: '',
    permissions: '',
    created_at: null,
    updated_at: '',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        SharePlanDialogComponent,
        MockComponents(ChipInputComponent, SectionLoaderComponent),
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
            firstName: 'Joe',
            lastName: 'Smith',
          }),
        }),
        MockProvider(InvitesService),
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
    component.isLoading = false;
    spyOn(TestBed.inject(InvitesService), 'invitesList').and.returnValue(of([]) as any);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('add email', () => {
    it('should add an email to the email list', () => {
      component.emails = ['john@planscape.com', 'jane@planscape.com'];
      component.addEmail('richard@planscape.com');
      expect(component.emails.length).toBe(3);
    });
  });

  describe('remove email', () => {
    it('should remove an email to the email list', () => {
      component.emails = [
        'john@planscape.com',
        'jane@planscape.com',
        'richard@planscape.com',
      ];
      component.removeEmail('john@planscape.com');
      expect(component.emails).toEqual([
        'jane@planscape.com',
        'richard@planscape.com',
      ]);
    });
  });

  describe('invite users', () => {
    it('should call inviteService with corresponding data', () => {
      component.emails = ['john@planscape.com', 'jane@planscape.com'];
      component.selectedRole = RoleEnum.Owner;
      component.message = 'Test message';

      const service = TestBed.inject(InvitesService);
      spyOn(service, 'invitesCreate').and.callThrough();

      component.invite();
      fixture.detectChanges();

      expect(service.invitesCreate).toHaveBeenCalledWith({
        emails: component.emails,
        role: component.selectedRole,
        object_pk: MOCK_PLAN.id,
        message: component.message || null,
      });
    });
  });

  describe('changeRole ', () => {
    it('should call inviteService with corresponding data', () => {
      const service = TestBed.inject(InvitesService);
      spyOn(service, 'invitesPartialUpdate').and.returnValue(of(mockInvite) as any);

      component.changeRole(mockInvite, RoleEnum.Collaborator);
      fixture.detectChanges();
      expect(service.invitesPartialUpdate).toHaveBeenCalledWith(
        mockInvite.id,
        { role: RoleEnum.Collaborator }
      );
    });
  });

  describe('changeInvitationsRole', () => {
    it('should change the role for the invites', () => {
      component.selectedRole = RoleEnum.Viewer;
      component.changeInvitationsRole(RoleEnum.Owner);
      expect(component.selectedRole).toBe(RoleEnum.Owner);
    });
  });

  describe('resendCode', () => {
    it('should call invite service with corresponding data', () => {
      const service = TestBed.inject(InvitesService);
      spyOn(service, 'invitesCreate').and.callThrough();

      component.selectedRole = RoleEnum.Owner;
      component.resendCode(mockInvite);
      fixture.detectChanges();
      expect(service.invitesCreate).toHaveBeenCalledWith({
        emails: [mockInvite.email],
        role: component.selectedRole,
        object_pk: MOCK_PLAN.id,
      });
    });
  });
});
