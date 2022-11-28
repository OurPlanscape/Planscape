import { LayoutModule } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { CookieService } from 'ngx-cookie-service';
import { ReactiveFormsModule } from '@angular/forms';

import { AccountDialogComponent } from './account-dialog/account-dialog.component';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthGuard, AuthService } from './auth.service';
import { LoginComponent } from './login/login.component';
import { MapService } from './map.service';
import { MapNameplateComponent } from './map/map-nameplate/map-nameplate.component';
import { MapComponent } from './map/map.component';
import { ProjectCardComponent } from './map/project-card/project-card.component';
import { MaterialModule } from './material/material.module';
import { NavigationComponent } from './navigation/navigation.component';
import { PopupService } from './popup.service';
import { RegionSelectionComponent } from './region-selection/region-selection.component';
import { SessionService } from './session.service';
import { SharedModule } from './shared/shared.module';
import { SignupComponent } from './signup/signup.component';
import { StringifyMapConfigPipe } from './stringify-map-config.pipe';
import { TopBarComponent } from './top-bar/top-bar.component';
import { PlanCreateDialogComponent } from './map/plan-create-dialog/plan-create-dialog.component';

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
    ProjectCardComponent,
    StringifyMapConfigPipe,
    MapNameplateComponent,
    PlanCreateDialogComponent,
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
export class AppModule {}
