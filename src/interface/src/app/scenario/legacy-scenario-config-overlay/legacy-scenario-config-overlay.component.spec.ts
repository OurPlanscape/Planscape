import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LegacyScenarioConfigOverlayComponent } from './legacy-scenario-config-overlay.component';
import { MockProvider } from 'ng-mocks';
import { ScenarioService } from '@services';
import { ScenarioState } from '../scenario.state';
import { BehaviorSubject, of } from 'rxjs';
import { MOCK_SCENARIO } from '@services/mocks';
import { ForsysService } from '@services/forsys.service';

describe('LegacyScenarioConfigOverlayComponent', () => {
  let component: LegacyScenarioConfigOverlayComponent;
  let fixture: ComponentFixture<LegacyScenarioConfigOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LegacyScenarioConfigOverlayComponent],
      providers: [
        MockProvider(ScenarioService),
        MockProvider(ForsysService, { excludedAreas$: of([]) }),
        MockProvider(ScenarioState, {
          displayConfigOverlay$: new BehaviorSubject(false),
          currentScenario$: new BehaviorSubject(MOCK_SCENARIO),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LegacyScenarioConfigOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
