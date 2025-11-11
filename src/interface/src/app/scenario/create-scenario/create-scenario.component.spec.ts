import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateScenarioComponent } from './create-scenario.component';

describe('CreateScenarioComponent', () => {
  let component: CreateScenarioComponent;
  let fixture: ComponentFixture<CreateScenarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateScenarioComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreateScenarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
