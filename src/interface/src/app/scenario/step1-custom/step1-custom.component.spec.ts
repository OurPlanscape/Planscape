import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Step1CustomComponent } from './step1-custom.component';
import { MockComponents } from 'ng-mocks';
import { Step1Component } from '../step1/step1.component';
import { ProcessOverviewComponent } from '../process-overview/process-overview.component';

describe('Step1WithOverviewComponent', () => {
  let component: Step1CustomComponent;
  let fixture: ComponentFixture<Step1CustomComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Step1CustomComponent],
      declarations: [MockComponents(Step1Component, ProcessOverviewComponent)],
    }).compileComponents();

    fixture = TestBed.createComponent(Step1CustomComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
