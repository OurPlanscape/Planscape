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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
