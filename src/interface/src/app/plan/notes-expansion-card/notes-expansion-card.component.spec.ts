import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { NotesExpansionCardComponent } from './notes-expansion-card.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('NotesExpansionCardComponent', () => {
  let component: NotesExpansionCardComponent;
  let fixture: ComponentFixture<NotesExpansionCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        MatDialogModule,
        NotesExpansionCardComponent,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotesExpansionCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
