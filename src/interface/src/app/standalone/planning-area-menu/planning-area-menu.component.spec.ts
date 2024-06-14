import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanningAreaMenuComponent } from './planning-area-menu.component';
import { MockProvider } from 'ng-mocks';
import { AuthService, PlanService } from '@services';
import { MatLegacyDialogModule } from '@angular/material/legacy-dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterTestingModule } from '@angular/router/testing';
import { MOCK_PLAN } from '@services/mocks';

describe('PlanningAreaMenuComponent', () => {
  let component: PlanningAreaMenuComponent;
  let fixture: ComponentFixture<PlanningAreaMenuComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PlanningAreaMenuComponent,
        MatLegacyDialogModule,
        RouterTestingModule,
      ],
      providers: [
        MockProvider(AuthService),
        MockProvider(MatSnackBar),
        MockProvider(PlanService),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanningAreaMenuComponent);
    component = fixture.componentInstance;
    component.plan = MOCK_PLAN;
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should disable delete if user cannot delete the planning area', () => {
    spyOn(authService, 'currentUser').and.returnValue({ id: 123 });

    expect(component.canDeletePlanningArea).toBeFalse();
  });

  it('should enable delete if user can delete the planning area', () => {
    spyOn(authService, 'currentUser').and.returnValue({ id: MOCK_PLAN.user });
    expect(component.canDeletePlanningArea).toBeTrue();
  });

  it('should disable share if share is not enabled', () => {
    expect(component.shareEnabled).toBeFalse();
  });

  it('should enable share if share is enabled', () => {
    component.plan = { ...MOCK_PLAN, permissions: ['view_collaborator'] };
    fixture.detectChanges();
    expect(component.shareEnabled).toBeTrue();
  });
});
