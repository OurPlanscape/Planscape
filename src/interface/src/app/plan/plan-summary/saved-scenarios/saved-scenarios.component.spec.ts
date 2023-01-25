import { MaterialModule } from 'src/app/material/material.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SavedScenariosComponent } from './saved-scenarios.component';

describe('SavedScenariosComponent', () => {
  let component: SavedScenariosComponent;
  let fixture: ComponentFixture<SavedScenariosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaterialModule],
      declarations: [SavedScenariosComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SavedScenariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('createScenario should emit event', () => {
    spyOn(component.createScenarioEvent, 'emit');

    component.createScenario();

    expect(component.createScenarioEvent.emit).toHaveBeenCalled();
  });
});
