import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FullReportViewComponent } from './full-report-view.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { MockProvider } from 'ng-mocks';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('FullReportViewComponent', () => {
  let component: FullReportViewComponent;
  let fixture: ComponentFixture<FullReportViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BrowserAnimationsModule,
        FullReportViewComponent,
        HttpClientTestingModule,
        MatSnackBarModule,
      ],
      providers: [
        MockProvider(MapConfigState),
        { provide: ActivatedRoute, useValue: { firstChild: {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FullReportViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
