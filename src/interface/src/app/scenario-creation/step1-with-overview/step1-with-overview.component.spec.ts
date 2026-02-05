import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Step1WithOverviewComponent } from '@app/scenario-creation/step1-with-overview/step1-with-overview.component';
import { MockComponents } from 'ng-mocks';
import { Step1Component } from '@app/scenario-creation/step1/step1.component';
import { ProcessOverviewComponent } from '@app/scenario-creation/process-overview/process-overview.component';

describe('Step1WithOverviewComponent', () => {
  let component: Step1WithOverviewComponent;
  let fixture: ComponentFixture<Step1WithOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Step1WithOverviewComponent],
      declarations: [MockComponents(Step1Component, ProcessOverviewComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(Step1WithOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
