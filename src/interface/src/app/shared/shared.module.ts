import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material/material.module';

import { FileUploaderComponent } from './file-uploader/file-uploader.component';
import { OpacitySliderComponent } from './opacity-slider/opacity-slider.component';
import { NavBarComponent } from './nav-bar/nav-bar.component';
import { FeaturesModule } from '../features/features.module';
import { RouterLinkWithHref } from '@angular/router';

@NgModule({
  declarations: [
    FileUploaderComponent,
    OpacitySliderComponent,
    NavBarComponent,
  ],
  exports: [FileUploaderComponent, OpacitySliderComponent, NavBarComponent],

  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    ReactiveFormsModule,
    FeaturesModule,
    RouterLinkWithHref,
  ],
})
export class SharedModule {}
