import { Component, Input } from '@angular/core';
import { SectionComponent } from '@styleguide';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NgxMaskModule } from 'ngx-mask';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { NgIf, NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-planning-approach',
  standalone: true,
  imports: [
    SectionComponent,
    MatFormFieldModule,
    MatInputModule,
    NgxMaskModule,
    ReactiveFormsModule,
    MatRadioModule,
    NgOptimizedImage,
    NgIf,
  ],
  templateUrl: './planning-approach.component.html',
  styleUrl: './planning-approach.component.scss',
})
export class PlanningApproachComponent {
  @Input() control!: FormControl<number | null>;
}
