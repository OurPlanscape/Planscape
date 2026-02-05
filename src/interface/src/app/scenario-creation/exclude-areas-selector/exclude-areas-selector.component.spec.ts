import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExcludeAreasSelectorComponent } from '@app/scenario-creation/exclude-areas-selector/exclude-areas-selector.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MockProvider } from 'ng-mocks';
import { NewScenarioState } from '@app/scenario-creation/new-scenario.state';
import { BehaviorSubject, of } from 'rxjs';
import { BaseLayersStateService } from '@app/base-layers/base-layers.state.service';

describe('ExcludeAreasSelectorComponent', () => {
  let component: ExcludeAreasSelectorComponent;
  let fixture: ComponentFixture<ExcludeAreasSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        NoopAnimationsModule,
        ExcludeAreasSelectorComponent,
      ],
      providers: [
        MockProvider(NewScenarioState, {
          excludedAreas$: of([]),
          scenarioConfig$: new BehaviorSubject({}),
        }),
        MockProvider(BaseLayersStateService, {
          selectedBaseLayers$: of([]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExcludeAreasSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
