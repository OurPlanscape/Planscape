import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NamePillarModalComponent } from '@app/plan/climate-foresight/name-pillar-modal/name-pillar-modal.component';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { DrawService } from '@app/maplibre-map/draw.service';
import { MockProvider } from 'ng-mocks';
import { ClimateForesightService } from '@services';

describe('NamePillarModalComponent', () => {
  let component: NamePillarModalComponent;
  let fixture: ComponentFixture<NamePillarModalComponent>;

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
      imports: [NamePillarModalComponent, MatDialogModule],
      providers: [
        MockProvider(ClimateForesightService),
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

    fixture = TestBed.createComponent(NamePillarModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
