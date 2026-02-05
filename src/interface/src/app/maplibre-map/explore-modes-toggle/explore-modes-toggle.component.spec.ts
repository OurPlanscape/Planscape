import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockProvider } from 'ng-mocks';
import { ExploreModesToggleComponent } from './explore-modes-toggle.component';
import { MapConfigState } from '../map-config.state';
import { MultiMapConfigState } from '../multi-map-config.state';
import { MatDialogModule } from '@angular/material/dialog';
import { DrawService } from '../draw.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('ExploreModesToggleComponent', () => {
  let component: ExploreModesToggleComponent;
  let fixture: ComponentFixture<ExploreModesToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        ExploreModesToggleComponent,
        MatDialogModule,
      ],
      providers: [
        MockProvider(MapConfigState),
        MockProvider(MultiMapConfigState),
        MockProvider(DrawService),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ExploreModesToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
