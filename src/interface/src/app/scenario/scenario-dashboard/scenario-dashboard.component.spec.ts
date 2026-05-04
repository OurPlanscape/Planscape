import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioDashboardComponent } from './scenario-dashboard.component';
import { NavBarComponent } from '@app/standalone/nav-bar/nav-bar.component';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import { OverlayLoaderComponent, TileButtonComponent } from '@styleguide';
import { DashboardLayoutComponent } from '@styleguide/dashboard-layout/dashboard-layout.component';
import { DetailsCardComponent } from '@styleguide/details-card/details-card.component';
import { ScenarioState } from '../scenario.state';
import { PlanState } from '@app/plan/plan.state';
import { ActivatedRoute } from '@angular/router';

describe('ScenarioDashboardComponent', () => {
  let component: ScenarioDashboardComponent;
  let fixture: ComponentFixture<ScenarioDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioDashboardComponent],
      declarations: [
        MockDeclarations(
          NavBarComponent,
          OverlayLoaderComponent,
          DashboardLayoutComponent,
          DetailsCardComponent,
          TileButtonComponent
        ),
      ],
      providers: [
        MockProvider(ScenarioState),
        MockProvider(PlanState),
        { provide: ActivatedRoute, useValue: { firstChild: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
