import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioComponent } from './scenario.component';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import { ScenarioMapComponent } from '../maplibre-map/scenario-map/scenario-map.component';
import { RouterModule } from '@angular/router';
import { NavBarComponent } from '@shared';
import { GoalOverlayComponent } from '../plan/goal-overlay/goal-overlay.component';
import { ScenarioState } from './scenario.state';

describe('ScenarioComponent', () => {
  let component: ScenarioComponent;
  let fixture: ComponentFixture<ScenarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [
        ScenarioComponent,
        MockDeclarations(
          ScenarioMapComponent,
          NavBarComponent,
          GoalOverlayComponent
        ),
      ],
      imports: [RouterModule],
      providers: [MockProvider(ScenarioState)],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
