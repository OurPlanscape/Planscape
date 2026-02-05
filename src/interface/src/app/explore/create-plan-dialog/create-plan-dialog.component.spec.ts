import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { CreatePlanDialogComponent } from './create-plan-dialog.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { DrawService } from '@maplibre/draw.service';

describe('ExplorePlanCreateDialogComponent', () => {
  let component: CreatePlanDialogComponent;
  let fixture: ComponentFixture<CreatePlanDialogComponent>;

  beforeEach(async () => {
    const fakeDrawService = {
      getCurrentAcreageValue: jasmine
        .createSpy('getCurrentAcreageValue')
        .and.returnValue(101),
    };
    const fakeDialogRef = jasmine.createSpyObj(
      'MatDialogRef',
      {
        close: undefined,
      },
      {}
    );

    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        MatDialogModule,
        MatSnackBarModule,
        CreatePlanDialogComponent,
      ],
      providers: [
        {
          provide: DrawService,
          useValue: fakeDrawService,
        },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { drawService: fakeDrawService },
        },
        {
          provide: MatDialogRef<CreatePlanDialogComponent>,
          useValue: fakeDialogRef,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreatePlanDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
