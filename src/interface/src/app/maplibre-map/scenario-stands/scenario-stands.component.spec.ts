import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioStandsComponent } from './scenario-stands.component';

describe('ScenarioStandsComponent', () => {
  let component: ScenarioStandsComponent;
  let fixture: ComponentFixture<ScenarioStandsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioStandsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ScenarioStandsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
