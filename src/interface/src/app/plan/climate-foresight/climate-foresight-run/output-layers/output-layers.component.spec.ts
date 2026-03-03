import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OutputLayersComponent } from './output-layers.component';
import { DataLayersStateService } from '@app/data-layers/data-layers.state.service';
import { MockProvider } from 'ng-mocks';
import { BehaviorSubject } from 'rxjs';

describe('OutputLayersComponent', () => {
  let component: OutputLayersComponent;
  let fixture: ComponentFixture<OutputLayersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OutputLayersComponent],
      providers: [
        MockProvider(DataLayersStateService, {
          viewedDataLayer$: new BehaviorSubject(null),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OutputLayersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
