import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SharePlanDialogComponent } from './share-plan-dialog.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MaterialModule } from '../../material/material.module';
import { MockProvider } from 'ng-mocks';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { InvitesService } from '../../services/invites.service';
import { BehaviorSubject, NEVER, of } from 'rxjs';
import { AuthService } from '../../services';
import { User } from '../../types';
import { PlanStateService } from '../../services/plan-state.service';

describe('SharePlanDialogComponent', () => {
  let component: SharePlanDialogComponent;
  let fixture: ComponentFixture<SharePlanDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SharePlanDialogComponent],
      imports: [MaterialModule, MatSnackBarModule, NoopAnimationsModule],
      providers: [
        MockProvider(PlanStateService, {
          getPlan: () => NEVER,
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
        }),
        {
          provide: MAT_DIALOG_DATA,
          useValue: { data: { name: 'Plan One', id: 12 } },
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
});
