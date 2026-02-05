import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapConfigState } from '@maplibre-map/map-config.state';
import { UploadPlanningAreaBoxComponent } from './upload-planning-area-box.component';
import { MockProvider } from 'ng-mocks';
import { DrawService } from '@maplibre-map/draw.service';

describe('UploadPlanningAreaBoxComponent', () => {
  let component: UploadPlanningAreaBoxComponent;
  let fixture: ComponentFixture<UploadPlanningAreaBoxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadPlanningAreaBoxComponent],
      providers: [MockProvider(MapConfigState), MockProvider(DrawService)],
    }).compileComponents();

    fixture = TestBed.createComponent(UploadPlanningAreaBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
