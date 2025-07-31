import { NgFor, NgIf } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { STAND_SIZES } from 'src/app/plan/plan-helpers';
import { SectionComponent } from 'src/styleguide/collapsible-panel/section.component';

@Component({
  selector: 'app-stand-size',
  standalone: true,
  imports: [
    NgFor,
    NgIf,
    SectionComponent,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './stand-size.component.html',
  styleUrl: './stand-size.component.scss',
})
export class StandSizeComponent {
  form: FormGroup = new FormGroup({
    standSize: new FormControl(null, [Validators.required]),
  });

  readonly standSizeOptions = Object.keys(STAND_SIZES);
}
