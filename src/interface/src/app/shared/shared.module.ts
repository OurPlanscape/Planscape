import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { LegendComponent } from './legend/legend.component';
import { FileUploaderComponent } from './file-uploader/file-uploader.component';

@NgModule({
  declarations: [
    FileUploaderComponent,
    LegendComponent
  ],
  exports: [
    FileUploaderComponent,
    LegendComponent
  ],
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
  ]
})
export class SharedModule { }
