import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewScenarioDetailsComponent } from './new-scenario-details.component';

describe('NewScenarioDetailsComponent', () => {
  let component: NewScenarioDetailsComponent;
  let fixture: ComponentFixture<NewScenarioDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewScenarioDetailsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NewScenarioDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
