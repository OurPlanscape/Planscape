import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { Step2Component } from './step2.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MockProvider } from 'ng-mocks';
import { NewScenarioState } from '../new-scenario.state';
import { of } from 'rxjs';

describe('Step2Component', () => {
  let component: Step2Component;
  let fixture: ComponentFixture<Step2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, NoopAnimationsModule, Step2Component],
      providers: [
        MockProvider(NewScenarioState, {
          excludedAreas$: of([]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Step2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
