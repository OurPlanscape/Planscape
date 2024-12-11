import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapLayerSelectDialogComponent } from './map-layer-select-dialog.component';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatRadioButton, MatRadioModule } from '@angular/material/radio';
import { MatRippleModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

describe('MapLayerSelectDialogComponent', () => {
  let component: MapLayerSelectDialogComponent;
  let fixture: ComponentFixture<MapLayerSelectDialogComponent>;

  beforeEach(async () => {
    const fakeData = {
      user: {
        email: 'test@test.com',
      },
    };
    const fakeDialog = jasmine.createSpyObj(
      'MatDialog',
      {
        open: undefined,
      },
      {}
    );
    const fakeDialogRef = jasmine.createSpyObj(
      'MatDialogRef',
      {
        close: undefined,
      },
      {}
    );
    await TestBed.configureTestingModule({
      // imports: [MapLayerSelectDialogComponent],
      declarations: [MapLayerSelectDialogComponent, MatRadioButton],
      imports: [MatRippleModule, MatIconModule, MatRadioModule, FormsModule],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: fakeData,
        },
        {
          provide: MatDialog,
          useValue: fakeDialog,
        },
        {
          provide: MatDialogRef<MapLayerSelectDialogComponent>,
          useValue: fakeDialogRef,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MapLayerSelectDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
