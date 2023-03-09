import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from 'src/app/material/material.module';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { OutcomeComponent } from './outcome.component';
import { SimpleChange, SimpleChanges } from '@angular/core';

describe('OutcomeComponent', () => {
  let component: OutcomeComponent;
  let fixture: ComponentFixture<OutcomeComponent>;
  let fakeScenario: any;

  beforeEach(async () => {
    fakeScenario = {
      id: '1',
      notes: 'bee happy',
      projectAreas: [{
        id: 10,
        estimatedAreaTreated: 2000,
      },
      {
        id: 11,
        estimatedAreaTreated: 5000,
      },
      {
        id: 12,
        estimatedAreaTreated: 6000,
      },
    ],
    }
    await TestBed.configureTestingModule({
      imports: [ BrowserAnimationsModule, MaterialModule, ReactiveFormsModule],
      declarations: [ OutcomeComponent ],
      providers: [ FormBuilder ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(OutcomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.scenario = fakeScenario;
    const changesObj: SimpleChanges = {
      scenario: new SimpleChange(null, fakeScenario, true),
    };
    component.ngOnChanges(changesObj);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set the notes when scenario is loaded', () => {
    expect(component.scenarioNotes.get('notes')?.value).toEqual('bee happy');
  });

  it('should calculate the total acres treated', () => {
    expect(component.totalAcresTreated).toEqual(13000);
  });
});
