import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewScenarioComponent } from './view-scenario.component';

describe('ViewScenarioComponent', () => {
  let component: ViewScenarioComponent;
  let fixture: ComponentFixture<ViewScenarioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewScenarioComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ViewScenarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
