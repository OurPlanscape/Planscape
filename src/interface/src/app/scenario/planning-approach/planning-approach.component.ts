import { Component } from '@angular/core';
import { SectionComponent } from '@styleguide';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NgxMaskModule } from 'ngx-mask';
import { ReactiveFormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import { NgOptimizedImage } from '@angular/common';

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
  ],
  templateUrl: './planning-approach.component.html',
  styleUrl: './planning-approach.component.scss',
})
export class PlanningApproachComponent {}
