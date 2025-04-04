import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharePlanDialogComponent } from './share-plan-dialog.component';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { LegacyMaterialModule } from '../../material/legacy-material.module';
import { MockComponents, MockProvider } from 'ng-mocks';

import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { AuthService, InvitesService } from '@services';
import { BehaviorSubject, of } from 'rxjs';
import { Plan, User } from '@types';
import { ChipInputComponent } from '../chip-input/chip-input.component';
import { SectionLoaderComponent } from '@shared';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { PlanState } from '../../plan/plan.state';

describe('SharePlanDialogComponent', () => {
  let component: SharePlanDialogComponent;
  let fixture: ComponentFixture<SharePlanDialogComponent>;
  const planningAreaId = 12;
  const mockInvite = {
    id: 2,
    inviter: 2,
    object_pk: 3,
    role: 'owner',
    email: 'some@asd.com',
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
        MockProvider(InvitesService, {
          getInvites: () => of([]),
          inviteUsers: () => of(mockInvite),
        }),
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            planningAreaName: 'Plan One',
            planningAreaId: planningAreaId,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SharePlanDialogComponent);
    component = fixture.componentInstance;
    component.isLoading = false;
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
      component.selectedRole = 'Owner';
      component.message = 'Test message';

      const service = TestBed.inject(InvitesService);
      spyOn(service, 'inviteUsers').and.callThrough();

      component.invite();
      fixture.detectChanges();

      expect(service.inviteUsers).toHaveBeenCalledWith(
        component.emails,
        component.selectedRole,
        12,
        component.message
      );
    });
  });

  describe('changeRole ', () => {
    it('should call inviteService with corresponding data', () => {
      const service = TestBed.inject(InvitesService);
      spyOn(service, 'changeRole').and.returnValue(of(mockInvite));

      component.changeRole(mockInvite, 'Collaborator');
      fixture.detectChanges();
      expect(service.changeRole).toHaveBeenCalledWith(
        mockInvite.id,
        'Collaborator'
      );
    });
  });

  describe('changeInvitationsRole', () => {
    it('should change the role for the invites', () => {
      component.selectedRole = 'Viewer';
      component.changeInvitationsRole('Owner');
      expect(component.selectedRole).toBe('Owner');
    });
  });

  describe('resendCode', () => {
    it('should call invite service with corresponding data', () => {
      const service = TestBed.inject(InvitesService);
      spyOn(service, 'inviteUsers').and.callThrough();

      component.selectedRole = 'Owner';
      component.resendCode(mockInvite);
      fixture.detectChanges();
      expect(service.inviteUsers).toHaveBeenCalledWith(
        [mockInvite.email],
        component.selectedRole,
        planningAreaId
      );
    });
  });
});
