import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material/material.module';
import { FileUploaderComponent } from './file-uploader/file-uploader.component';
import { OpacitySliderComponent } from './opacity-slider/opacity-slider.component';
import { NavBarComponent } from './nav-bar/nav-bar.component';
import { FeaturesModule } from '../features/features.module';
import { RouterLink } from '@angular/router';
import { CurrencyInKPipe } from './pipes/currency-in-k.pipe';
import { TypeSafeMatCellDef } from './type-safe-mat-cell/type-safe-mat-cell-def.directive';
import { FieldAlertComponent } from './field-alert/field-alert.component';
import { CreditsBlurbComponent } from './credits-blurb/credits-blurb.component';
import { FormMessageBoxComponent } from './form-message-box/form-message-box.component';
import { ShareExploreDialogComponent } from './share-explore-dialog/share-explore-dialog.component';
import { SectionLoaderComponent } from './section-loader/section-loader.component';
import { TopBarComponent } from './top-bar/top-bar.component';

@NgModule({
  declarations: [
    FileUploaderComponent,
    OpacitySliderComponent,
    NavBarComponent,
    CurrencyInKPipe,
    TypeSafeMatCellDef,
    FieldAlertComponent,
    CreditsBlurbComponent,
    FormMessageBoxComponent,
    ShareExploreDialogComponent,
    SectionLoaderComponent,
    TopBarComponent,
  ],
  exports: [
    FileUploaderComponent,
    OpacitySliderComponent,
    NavBarComponent,
    CurrencyInKPipe,
    TypeSafeMatCellDef,
    FieldAlertComponent,
    CreditsBlurbComponent,
    FormMessageBoxComponent,
    SectionLoaderComponent,
    TopBarComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    ReactiveFormsModule,
    FeaturesModule,
    RouterLink,
  ],
})
export class SharedModule {}
