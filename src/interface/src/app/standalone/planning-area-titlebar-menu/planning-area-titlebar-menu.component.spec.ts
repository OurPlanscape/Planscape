import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanningAreaTitlebarMenuComponent } from './planning-area-titlebar-menu.component';
import { MockProvider } from 'ng-mocks';
import { AuthService, PlanService } from '@services';

import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterTestingModule } from '@angular/router/testing';
import { MOCK_PLAN } from '@services/mocks';
import { MatDialogModule } from '@angular/material/dialog';

describe('PlanningAreaMenuComponent', () => {
  let component: PlanningAreaTitlebarMenuComponent;
  let fixture: ComponentFixture<PlanningAreaTitlebarMenuComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PlanningAreaTitlebarMenuComponent,
        MatDialogModule,
        RouterTestingModule,
      ],
      providers: [
        MockProvider(AuthService),
        MockProvider(MatSnackBar),
        MockProvider(PlanService),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlanningAreaTitlebarMenuComponent);
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
});
