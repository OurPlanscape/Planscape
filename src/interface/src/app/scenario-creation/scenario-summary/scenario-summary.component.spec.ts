import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { ScenarioSummaryComponent } from './scenario-summary.component';
import { MockDeclaration, MockProvider } from 'ng-mocks';
import { SectionComponent } from '@styleguide';
import { of } from 'rxjs';
import { NewScenarioState } from '../new-scenario.state';

describe('ScenarioSummaryComponent', () => {
  let component: ScenarioSummaryComponent;
  let fixture: ComponentFixture<ScenarioSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MockDeclaration(SectionComponent)],
      imports: [HttpClientModule, ScenarioSummaryComponent],
      providers: [
        MockProvider(NewScenarioState, {
          scenarioConfig$: of({}),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
