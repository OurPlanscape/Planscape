import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScenarioErrorModalComponent } from './scenario-error-modal.component';
import { MatDialogRef } from '@angular/material/dialog';

describe('SavingErrorModalComponent', () => {
  let component: ScenarioErrorModalComponent;
  let fixture: ComponentFixture<ScenarioErrorModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScenarioErrorModalComponent],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close: () => {},
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioErrorModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
