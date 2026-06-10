import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncludeAreasSelectorComponent } from './include-areas-selector.component';
import { MockProvider } from 'ng-mocks';
import { NewScenarioState } from '../new-scenario.state';
import { BehaviorSubject, of } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ExcludeAreasSelectorComponent } from '../exclude-areas-selector/exclude-areas-selector.component';
import { BaseLayersStateService } from '@app/base-layers/base-layers.state.service';

describe('IncludeAreasSelectorComponent', () => {
  let component: IncludeAreasSelectorComponent;
  let fixture: ComponentFixture<IncludeAreasSelectorComponent>;

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

    fixture = TestBed.createComponent(IncludeAreasSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
