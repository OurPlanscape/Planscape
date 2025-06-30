import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { ExplorePlanCreateDialogComponent } from './explore-plan-create-dialog.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { DrawService } from '../draw.service';

describe('ExplorePlanCreateDialogComponent', () => {
  let component: ExplorePlanCreateDialogComponent;
  let fixture: ComponentFixture<ExplorePlanCreateDialogComponent>;

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
        ExplorePlanCreateDialogComponent,
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
          provide: MatDialogRef<ExplorePlanCreateDialogComponent>,
          useValue: fakeDialogRef,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExplorePlanCreateDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
