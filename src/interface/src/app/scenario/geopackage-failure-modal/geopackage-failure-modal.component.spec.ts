import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { GeopackageFailureModalComponent } from './geopackage-failure-modal.component';

describe('GeopackageFailureModalComponent', () => {
  let component: GeopackageFailureModalComponent;
  let fixture: ComponentFixture<GeopackageFailureModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeopackageFailureModalComponent],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close: () => {},
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GeopackageFailureModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
