import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UploadProjectAreasModalComponent } from './upload-project-areas-modal.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';

describe('UploadProjectAreasModalComponent', () => {
  let component: UploadProjectAreasModalComponent;
  let fixture: ComponentFixture<UploadProjectAreasModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        MatDialogModule,
        UploadProjectAreasModalComponent,
      ],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: {},
        },
        {
          provide: MatDialogRef,
          useValue: {},
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UploadProjectAreasModalComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
