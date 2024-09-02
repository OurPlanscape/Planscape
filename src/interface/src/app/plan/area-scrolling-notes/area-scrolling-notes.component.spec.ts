import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService, PlanNotesService } from '@services';
import { MatLegacySnackBarModule as MatSnackBarModule } from '@angular/material/legacy-snack-bar';
import { AreaScrollingNotesComponent } from './area-scrolling-notes.component';
import { MockProvider } from 'ng-mocks';
import { of } from 'rxjs';
import { MatDialogModule } from '@angular/material/dialog';

describe('AreaScrollingNotesComponent', () => {
  let component: AreaScrollingNotesComponent;
  let fixture: ComponentFixture<AreaScrollingNotesComponent>;
  let fakeAuthService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AreaScrollingNotesComponent],
      imports: [MatDialogModule, MatSnackBarModule],
      providers: [
        {
          provide: AuthService,
          useValue: fakeAuthService,
        },
        MockProvider(PlanNotesService, {
          getNotes: () => of([]),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AreaScrollingNotesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
