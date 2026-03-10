import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubUnitToggleComponent } from './sub-unit-toggle.component';
import { BaseLayersStateService } from '@base-layers/base-layers.state.service';
import { BaseLayer } from '@types';

describe('SubUnitToggleComponent', () => {
  let component: SubUnitToggleComponent;
  let fixture: ComponentFixture<SubUnitToggleComponent>;
  let baseLayersServiceSpy: jasmine.SpyObj<BaseLayersStateService>;

  const mockLayer = { id: 1, name: 'Subfireshed' } as BaseLayer;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('BaseLayersStateService', [
      'addBaseLayer',
      'removeBaseLayer',
      'clearBaseLayer',
    ]);

    await TestBed.configureTestingModule({
      imports: [SubUnitToggleComponent],
      providers: [{ provide: BaseLayersStateService, useValue: spy }],
    }).compileComponents();

    baseLayersServiceSpy = TestBed.inject(
      BaseLayersStateService
    ) as jasmine.SpyObj<BaseLayersStateService>;

    fixture = TestBed.createComponent(SubUnitToggleComponent);
    component = fixture.componentInstance;
    component.layer = mockLayer;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the layer name', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Subfireshed');
  });

  it('should call addBaseLayer when toggled on', () => {
    component.showBaseLayer = true;
    component.toggleBaseLayer(mockLayer);
    expect(baseLayersServiceSpy.addBaseLayer).toHaveBeenCalledWith(mockLayer);
  });

  it('should call removeBaseLayer when toggled off', () => {
    component.showBaseLayer = false;
    component.toggleBaseLayer(mockLayer);
    expect(baseLayersServiceSpy.removeBaseLayer).toHaveBeenCalledWith(
      mockLayer
    );
  });
});
