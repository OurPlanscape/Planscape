import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService, ModelNotesService } from '@services';

import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';

import { AreaNotesComponent } from './area-notes.component';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';
import { MatDialogModule } from '@angular/material/dialog';

describe('AreaNotesComponent', () => {
  let component: AreaNotesComponent;
  let fixture: ComponentFixture<AreaNotesComponent>;
  let fakeAuthService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AreaNotesComponent],
      imports: [MatDialogModule, MatSnackBarModule],
      providers: [
        {
          provide: AuthService,
          useValue: fakeAuthService,
        },
        MockProvider(ModelNotesService, {
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
