import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapConfigState } from '@app/maplibre-map/map-config.state';
import { UploadPlanningAreaBoxComponent } from '@app/explore/upload-planning-area-box/upload-planning-area-box.component';
import { MockProvider } from 'ng-mocks';
import { DrawService } from '@app/maplibre-map/draw.service';

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
