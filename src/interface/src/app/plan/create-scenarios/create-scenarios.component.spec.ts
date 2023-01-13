import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { colormapConfigToLegend } from 'src/app/types';

import { MapService } from './../../services/map.service';
import { ColormapConfig } from './../../types/legend.types';
import { CreateScenariosComponent } from './create-scenarios.component';

describe('CreateScenariosComponent', () => {
  let component: CreateScenariosComponent;
  let fixture: ComponentFixture<CreateScenariosComponent>;
  let fakeMapService: MapService;

  const fakeColormapConfig: ColormapConfig = {
    name: 'fakecolormap',
    values: [
      {
        rgb: '#000000',
        name: 'fakelabel',
      },
    ],
  };

  beforeEach(async () => {
    fakeMapService = jasmine.createSpyObj('MapService', {
      getColormap: of(fakeColormapConfig),
    });
    await TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      declarations: [CreateScenariosComponent],
      providers: [{ provide: MapService, useValue: fakeMapService }],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateScenariosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch colormap from service to create legend', () => {
    expect(fakeMapService.getColormap).toHaveBeenCalledOnceWith('viridis');
    expect(component.legend).toEqual(
      colormapConfigToLegend(fakeColormapConfig)
    );
  });
});
