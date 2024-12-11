import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService, PlanningAreaNotesService } from '@services';

import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';

import { AreaNotesComponent } from './area-notes.component';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('AreaNotesComponent', () => {
  let component: AreaNotesComponent;
  let fixture: ComponentFixture<AreaNotesComponent>;
  let fakeAuthService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AreaNotesComponent],
      imports: [
        MatDialogModule,
        MatSnackBarModule,
        MatFormFieldModule,
        MatInputModule,
        FormsModule,
        NoopAnimationsModule,
      ],
      providers: [
        {
          provide: AuthService,
          useValue: fakeAuthService,
        },
        MockProvider(PlanningAreaNotesService, {
          getNotes: () => of([]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AreaNotesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
