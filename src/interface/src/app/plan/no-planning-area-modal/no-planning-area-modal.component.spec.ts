import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { NoPlanningAreaModalComponent } from './no-planning-area-modal.component';

describe('NoPlanningAreaModalComponent', () => {
  let component: NoPlanningAreaModalComponent;
  let fixture: ComponentFixture<NoPlanningAreaModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoPlanningAreaModalComponent],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close: () => {},
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NoPlanningAreaModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
