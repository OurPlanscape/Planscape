import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RunAnalysisModalComponent } from './run-analysis-modal.component';
import { DrawService } from 'src/app/maplibre-map/draw.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NamePillarModalComponent } from '../name-pillar-modal/name-pillar-modal.component';

describe('RunAnalysisModalComponent', () => {
  let component: RunAnalysisModalComponent;
  let fixture: ComponentFixture<RunAnalysisModalComponent>;

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
      imports: [RunAnalysisModalComponent],
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
          provide: MatDialogRef<NamePillarModalComponent>,
          useValue: fakeDialogRef,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RunAnalysisModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
