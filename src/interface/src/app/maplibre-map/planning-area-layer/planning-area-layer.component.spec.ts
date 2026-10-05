import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanningAreaLayerComponent } from './planning-area-layer.component';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import {
  FeatureComponent,
  GeoJSONSourceComponent,
  LayerComponent,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { PlanState } from '@plan/plan.state';
import { MARTIN_SOURCES } from '@treatments/map.sources';
import { SimpleChange } from '@angular/core';

describe('PlanningAreaLayerComponent', () => {
  let component: PlanningAreaLayerComponent;
  let fixture: ComponentFixture<PlanningAreaLayerComponent>;
  let currentPlanId$: BehaviorSubject<number | null>;

  beforeEach(async () => {
    currentPlanId$ = new BehaviorSubject<number | null>(12);

    await TestBed.configureTestingModule({
      imports: [PlanningAreaLayerComponent],
      providers: [
        MockProvider(PlanState, {
          currentPlanId$,
        }),
      ],
      declarations: MockDeclarations(
        FeatureComponent,
        GeoJSONSourceComponent,
        LayerComponent,
        VectorSourceComponent
      ),
    }).compileComponents();

    fixture = TestBed.createComponent(PlanningAreaLayerComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('builds the tiles URL from the provided plan id', async () => {
    component.planId = 42;

    component.ngOnChanges({
      planId: new SimpleChange(null, 42, false),
    });

    const tilesUrl = await firstValueFrom(component.tilesUrl$);

    expect(tilesUrl).toBe(`${MARTIN_SOURCES.planningArea.tilesUrl}?id=42`);
  });

  it('builds the shared-link tiles URL from the provided UUID', async () => {
    component.planId = null;
    component.sharedLinkUuid = 'test-uuid';

    component.ngOnChanges({
      sharedLinkUuid: new SimpleChange(null, 'test-uuid', false),
    });

    const tilesUrl = await firstValueFrom(component.tilesUrl$);

    expect(tilesUrl).toBe(
      `${MARTIN_SOURCES.planningAreaByForSharedLink.tilesUrl}?uuid=test-uuid`
    );
  });

  it('builds the tiles URL from the current plan id when no plan id or shared UUID is provided', async () => {
    component.planId = null;
    component.sharedLinkUuid = null;

    component.ngOnChanges({
      planId: new SimpleChange(undefined, null, false),
    });

    currentPlanId$.next(42);

    const tilesUrl = await firstValueFrom(component.tilesUrl$);

    expect(tilesUrl).toBe(`${MARTIN_SOURCES.planningArea.tilesUrl}?id=42`);
  });

  it('prioritizes plan id over shared-link UUID', async () => {
    component.planId = 42;
    component.sharedLinkUuid = 'test-uuid';

    component.ngOnChanges({
      planId: new SimpleChange(null, 42, false),
      sharedLinkUuid: new SimpleChange(null, 'test-uuid', false),
    });

    const tilesUrl = await firstValueFrom(component.tilesUrl$);

    expect(tilesUrl).toBe(`${MARTIN_SOURCES.planningArea.tilesUrl}?id=42`);
  });

  it('renders the vector source and layer when tiles URL is available', () => {
    fixture.componentRef.setInput('planId', 12);

    fixture.detectChanges();

    const vectorSource =
      fixture.nativeElement.querySelector('mgl-vector-source');
    const layer = fixture.nativeElement.querySelector('mgl-layer');

    expect(vectorSource).toBeTruthy();
    expect(layer).toBeTruthy();
  });
});
