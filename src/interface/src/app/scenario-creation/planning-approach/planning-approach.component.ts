import { Component, Input } from '@angular/core';
import { SectionComponent } from '@styleguide';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NgxMaskModule } from 'ngx-mask';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { NgFor, NgIf } from '@angular/common';

type PlanningApproachOption = {
  value: string;
  title: string;
  description: string;
  recommendation: string;
  imageSrc: string;
  imageAlt: string;
  imageCaption: string;
};

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
    NgFor,
    NgIf,
  ],
  templateUrl: './planning-approach.component.html',
  styleUrl: './planning-approach.component.scss',
})
export class PlanningApproachComponent {
  @Input() control!: FormControl<string | null>;

  readonly planningApproachOptions: PlanningApproachOption[] = [
    {
      value: 'PRIORITIZE_SUB_UNITS',
      title: 'Prioritize Sub-Units',
      description:
        'Would you like to prioritize existing sub-units within your Planning Area based on your scenario?',
      recommendation:
        'Recommended for Larger Planning Areas, e.g., National Forest or County',
      imageSrc: 'assets/png/sub-units.png',
      imageAlt: 'Ex. shows prioritized Subwatersheds',
      imageCaption: 'Ex. shows prioritized Subwatersheds.',
    },
    {
      value: 'OPTIMIZE_PROJECT_AREAS',
      title: 'Optimize Project Areas',
      description:
        'Would you like ForSys to create spatially optimized Project Areas within your Planning Area based on your scenario?',
      recommendation:
        'Recommended for Smaller Planning Areas, e.g., District or Watersheds',
      imageSrc: 'assets/png/project-areas.png',
      imageAlt: 'Ex. shows show optimized project areas',
      imageCaption: 'Ex. shows show optimized project areas.',
    },
  ];
}
