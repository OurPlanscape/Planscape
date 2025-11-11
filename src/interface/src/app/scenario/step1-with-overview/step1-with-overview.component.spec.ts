import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Step1WithOverviewComponent } from './step1-with-overview.component';

describe('Step1WithOverviewComponent', () => {
  let component: Step1WithOverviewComponent;
  let fixture: ComponentFixture<Step1WithOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Step1WithOverviewComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(Step1WithOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
