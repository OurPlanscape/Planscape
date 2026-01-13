import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomPriorityObjectivesComponent } from './custom-priority-objectives.component';

describe('CustomPriorityObjectivesComponent', () => {
  let component: CustomPriorityObjectivesComponent;
  let fixture: ComponentFixture<CustomPriorityObjectivesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomPriorityObjectivesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomPriorityObjectivesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
