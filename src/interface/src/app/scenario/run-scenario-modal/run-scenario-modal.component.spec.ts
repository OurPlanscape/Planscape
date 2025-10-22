import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { RunScenarioModalComponent } from './run-scenario-modal.component';

describe('RunScenarioModalComponent', () => {
  let component: RunScenarioModalComponent;
  let fixture: ComponentFixture<RunScenarioModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RunScenarioModalComponent],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close: () => {},
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RunScenarioModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
