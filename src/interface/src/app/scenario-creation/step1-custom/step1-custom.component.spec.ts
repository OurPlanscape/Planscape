import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Step1CustomComponent } from '@app/scenario-creation/step1-custom/step1-custom.component';
import { MockComponents, MockProvider } from 'ng-mocks';
import { Step1Component } from '@app/scenario-creation/step1/step1.component';
import { BehaviorSubject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { NewScenarioState } from '@app/scenario-creation/new-scenario.state';

describe('Step1CustomComponent', () => {
  let component: Step1CustomComponent;
  let fixture: ComponentFixture<Step1CustomComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Step1CustomComponent],
      declarations: [MockComponents(Step1Component)],
      providers: [
        MockProvider(NewScenarioState, {
          scenarioConfig$: new BehaviorSubject({}),
        }),
        MockProvider(ActivatedRoute, {
          snapshot: {
            data: {
              planId: 24,
            },
          } as any,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Step1CustomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
