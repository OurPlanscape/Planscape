import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AccountPageComponent } from '@account/account-page/account-page.component';
import { AccountRoutingModule } from './account-routing.module';
import { ChangePasswordComponent } from '@account/change-password/change-password.component';
import { DeleteAccountComponent } from '@account/delete-account/delete-account.component';
import { DeleteAccountDialogComponent } from '@account/delete-account-dialog/delete-account-dialog.component';
import { DetailsComponent } from '@account/details/details.component';
import { EditUserFieldComponent } from '@account/edit-user-field/edit-user-field.component';
import { FeaturesModule } from '@features/features.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LegacyMaterialModule } from '@material/legacy-material.module';
import { MenuComponent } from '@account/menu/menu.component';
import { SharedModule } from '@shared';

@NgModule({
  declarations: [
    AccountPageComponent,
    ChangePasswordComponent,
    DeleteAccountComponent,
    DeleteAccountDialogComponent,
    DetailsComponent,
    EditUserFieldComponent,
    MenuComponent,
  ],
  imports: [
    AccountRoutingModule,
    CommonModule,
    FeaturesModule,
    FormsModule,
    LegacyMaterialModule,
    ReactiveFormsModule,
    SharedModule,
  ],
})
export class AccountModule {}
