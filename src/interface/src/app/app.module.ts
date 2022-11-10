import { SharedModule } from './shared/shared.module';
import { LayoutModule } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CookieService } from 'ngx-cookie-service';

import { AccountDialogComponent } from './account-dialog/account-dialog.component';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthGuard, AuthService } from './auth.service';
import { LoginComponent } from './login/login.component';
import { MapService } from './map.service';
import { MapComponent } from './map/map.component';
import { MaterialModule } from './material/material.module';
import { NavigationComponent } from './navigation/navigation.component';
import { PopupService } from './popup.service';
import { RegionSelectionComponent } from './region-selection/region-selection.component';
import { SessionService } from './session.service';
import { SignupComponent } from './signup/signup.component';
import { TopBarComponent } from './top-bar/top-bar.component';

@NgModule({
  declarations: [
    AppComponent,
    MapComponent,
    LoginComponent,
    SignupComponent,
    NavigationComponent,
    TopBarComponent,
    AccountDialogComponent,
    RegionSelectionComponent,
  ],
  imports: [
    AppRoutingModule,
    BrowserAnimationsModule,
    BrowserModule,
    CommonModule,
    FormsModule,
    HttpClientModule,
    LayoutModule,
    MaterialModule,
    SharedModule,
    MatMomentDateModule,
    ReactiveFormsModule,
  ],
  providers: [
    AuthService,
    AuthGuard,
    PopupService,
    MapService,
    CookieService,
    SessionService,
  ],
  bootstrap: [AppComponent],
  entryComponents: [AccountDialogComponent],
})
export class AppModule { }
