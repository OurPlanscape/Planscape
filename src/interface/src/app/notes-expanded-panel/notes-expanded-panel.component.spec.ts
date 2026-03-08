import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotesExpandedPanelComponent } from './notes-expanded-panel.component';
import { MockProvider } from 'ng-mocks';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('NotesExpandedPanelComponent', () => {
  let component: NotesExpandedPanelComponent;
  let fixture: ComponentFixture<NotesExpandedPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        HttpClientTestingModule,
        MatDialogModule,
        MatSnackBarModule,
        NotesExpandedPanelComponent,
      ],
      providers: [
        MockProvider(MatDialogRef),
        {
          provide: MAT_DIALOG_DATA,
          useValue: { plan: { id: 100 } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotesExpandedPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
