import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ScenarioDownloadFooterComponent } from './scenario-download-footer.component';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';

describe('ScenarioDownloadFooterComponent', () => {
  let component: ScenarioDownloadFooterComponent;
  let fixture: ComponentFixture<ScenarioDownloadFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MatDialogModule,
        MatSnackBarModule,
        HttpClientTestingModule,
        ScenarioDownloadFooterComponent,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ScenarioDownloadFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
