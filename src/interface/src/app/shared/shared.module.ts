import { NgModule } from '@angular/core';
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
    CommonModule
  ]
})
export class SharedModule { }
