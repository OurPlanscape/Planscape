import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioDashboardFooterComponent } from './scenario-dashboard-footer.component';
import { MockDeclarations, MockProviders } from 'ng-mocks';
import { ScenarioService } from '@app/services';
import { ScenarioConfigOverlayComponent } from '../scenario-config-overlay/scenario-config-overlay.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LegacyScenarioConfigOverlayComponent } from '../legacy-scenario-config-overlay/legacy-scenario-config-overlay.component';
import { ButtonComponent } from '@styleguide';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';

describe('ScenarioDashboardFooterComponent', () => {
  let component: ScenarioDashboardFooterComponent;
  let fixture: ComponentFixture<ScenarioDashboardFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioDashboardFooterComponent],
      declarations: [
        MockDeclarations(
          ScenarioConfigOverlayComponent,
          LegacyScenarioConfigOverlayComponent,
          ButtonComponent
        ),
      ],
      providers: [
        MockProviders(MatSnackBar, MatDialog, ScenarioService),
        { provide: ActivatedRoute, useValue: { firstChild: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioDashboardFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
