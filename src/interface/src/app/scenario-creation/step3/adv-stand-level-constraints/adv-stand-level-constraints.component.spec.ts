import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdvStandLevelConstraintsComponent } from './adv-stand-level-constraints.component';
import { MatDialog } from '@angular/material/dialog';
import { AdvStandLevelConstraintsModalComponent } from '../adv-stand-level-constraints-modal/adv-stand-level-constraints-modal.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';

describe('AdvStandLevelConstraintsComponent', () => {
  let component: AdvStandLevelConstraintsComponent;
  let fixture: ComponentFixture<AdvStandLevelConstraintsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AdvStandLevelConstraintsComponent,
        HttpClientTestingModule,
        MatSnackBarModule,
      ],
      providers: [
        {
          provide: MatDialog,
          useValue: AdvStandLevelConstraintsModalComponent,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdvStandLevelConstraintsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
