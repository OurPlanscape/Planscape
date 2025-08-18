import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioConfigOverlayComponent } from './scenario-config-overlay.component';
import { MockProvider } from 'ng-mocks';
import { ScenarioService } from '@services';
import { ScenarioState } from '../scenario.state';
import { BehaviorSubject } from 'rxjs';
import { MOCK_SCENARIO } from '@services/mocks';

describe('ScenarioConfigOverlayComponent', () => {
  let component: ScenarioConfigOverlayComponent;
  let fixture: ComponentFixture<ScenarioConfigOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioConfigOverlayComponent],
      providers: [
        MockProvider(ScenarioService),
        MockProvider(ScenarioState, {
          displayConfigOverlay$: new BehaviorSubject(false),
          currentScenario$: new BehaviorSubject(MOCK_SCENARIO),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioConfigOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
