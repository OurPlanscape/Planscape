import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { OutsideStateDialogComponentComponent } from './outside-state-dialog-component.component';
import { FeatureService } from 'src/app/features/feature.service';
import { MockProvider } from 'ng-mocks';

describe('OutsideStateDialogComponentComponent', () => {
  let component: OutsideStateDialogComponentComponent;
  let fixture: ComponentFixture<OutsideStateDialogComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OutsideStateDialogComponentComponent],
      providers: [
        {
          provide: MatDialogRef,
          useValue: {
            close: () => {},
          },
        },
        MockProvider(FeatureService),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OutsideStateDialogComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
