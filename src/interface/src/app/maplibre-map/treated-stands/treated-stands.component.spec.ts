import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreatedStandsComponent } from './treated-stands.component';
import { ActivatedRoute } from '@angular/router';
import { MockDeclarations, MockProvider } from 'ng-mocks';
import {
  ImageComponent,
  LayerComponent,
  MapService,
  VectorSourceComponent,
} from '@maplibre/ngx-maplibre-gl';

describe('TreatedStandsComponent', () => {
  let component: TreatedStandsComponent;
  let fixture: ComponentFixture<TreatedStandsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TreatedStandsComponent],
      declarations: [
        MockDeclarations(LayerComponent, VectorSourceComponent, ImageComponent),
      ],
      providers: [
        MockProvider(MapService),
        { provide: ActivatedRoute, useValue: { snapshot: { data: '' } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TreatedStandsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
