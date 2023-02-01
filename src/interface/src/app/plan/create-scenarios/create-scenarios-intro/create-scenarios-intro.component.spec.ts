import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, Validators } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MaterialModule } from 'src/app/material/material.module';
import { colormapConfigToLegend } from 'src/app/types';

import { MapService } from './../../../services/map.service';
import { SharedModule } from './../../../shared/shared.module';
import { ColormapConfig } from './../../../types/legend.types';
import { CreateScenariosIntroComponent } from './create-scenarios-intro.component';

describe('CreateScenariosIntroComponent', () => {
  let component: CreateScenariosIntroComponent;
  let fixture: ComponentFixture<CreateScenariosIntroComponent>;
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
      imports: [
        BrowserAnimationsModule,
        HttpClientTestingModule,
        MaterialModule,
        SharedModule,
      ],
      declarations: [CreateScenariosIntroComponent],
      providers: [
        FormBuilder,
        { provide: MapService, useValue: fakeMapService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateScenariosIntroComponent);
    component = fixture.componentInstance;

    const fb = fixture.componentRef.injector.get(FormBuilder);
    component.formGroup = fb.group({
      scoreSelectCtrl: ['', Validators.required],
    });

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should fetch colormap from service to create legend', () => {
    expect(fakeMapService.getColormap).toHaveBeenCalledOnceWith('turbo');
    expect(component.legend).toEqual(
      colormapConfigToLegend(fakeColormapConfig)
    );
  });

  it('when form is valid, form complete event is emitted', () => {
    spyOn(component.formCompleteEvent, 'emit');

    // Fill out form to make it "valid"
    component.formGroup?.get('scoreSelectCtrl')?.setValue('test');

    expect(component.formCompleteEvent.emit).toHaveBeenCalledOnceWith();
  });
});
