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

  describe('drawPlanningArea navigation state', () => {
    afterEach(() => {
      history.replaceState({}, document.title);
    });

    it('enters drawing mode and clears the flag when set', () => {
      const mapConfigState = TestBed.inject(MapConfigState);
      const enterDrawingModeSpy = spyOn(mapConfigState, 'enterDrawingMode');
      history.replaceState({ drawPlanningArea: true }, document.title);

      TestBed.createComponent(ExploreModesToggleComponent);

      expect(enterDrawingModeSpy).toHaveBeenCalled();
      expect(history.state.drawPlanningArea).toBeUndefined();
    });

    it('does not enter drawing mode when not set', () => {
      const mapConfigState = TestBed.inject(MapConfigState);
      const enterDrawingModeSpy = spyOn(mapConfigState, 'enterDrawingMode');
      history.replaceState({}, document.title);

      TestBed.createComponent(ExploreModesToggleComponent);

      expect(enterDrawingModeSpy).not.toHaveBeenCalled();
    });
  });
});
