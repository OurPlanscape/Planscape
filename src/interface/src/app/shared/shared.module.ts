import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LegacyMaterialModule } from '../material/legacy-material.module';
import { FileUploaderComponent } from './file-uploader/file-uploader.component';
import { NavBarComponent } from './nav-bar/nav-bar.component';
import { FeaturesModule } from '../features/features.module';
import { RouterLink } from '@angular/router';
import { CurrencyInKPipe } from './pipes/currency-in-k.pipe';
import { TypeSafeMatCellDef } from './type-safe-mat-cell/type-safe-mat-cell-def.directive';
import { FieldAlertComponent } from './field-alert/field-alert.component';
import { CreditsBlurbComponent } from './credits-blurb/credits-blurb.component';
import { FormMessageBoxComponent } from './form-message-box/form-message-box.component';
import { SectionLoaderComponent } from './section-loader/section-loader.component';
import { TopBarComponent } from './top-bar/top-bar.component';
import { ButtonComponent } from '@styleguide';

@NgModule({
  declarations: [
    FileUploaderComponent,
    NavBarComponent,
    CurrencyInKPipe,
    TypeSafeMatCellDef,
    FieldAlertComponent,
    CreditsBlurbComponent,
    FormMessageBoxComponent,
    SectionLoaderComponent,
    TopBarComponent,
  ],
  exports: [
    FileUploaderComponent,
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
    LegacyMaterialModule,
    ReactiveFormsModule,
    FeaturesModule,
    RouterLink,
    ButtonComponent,
  ],
})
export class SharedModule {}
