import { BrowserModule } from '@angular/platform-browser';
import {ErrorHandler, NgModule} from '@angular/core';

import { AppRoutingModule } from './app-routing.module';

import { NgbModule} from '@ng-bootstrap/ng-bootstrap';
import { HomeComponent } from './home/home.component';
import { RootComponent } from './root/root.component';
import { ReactiveFormsModule} from '@angular/forms';
import { HttpClientModule} from '@angular/common/http';
import { SearchComponent } from './search/search.component';
import { AuthService } from './auth.service';
import { HeaderComponent } from './header/header.component';
import { CallbackComponent } from './callback/callback.component';
import { AuthErrorComponent } from './auth-error/auth-error.component';
import { AuthVerifyEmailComponent } from './auth-verify-email/auth-verify-email.component';
import { AuthEmailVerifiedComponent } from './auth-email-verified/auth-email-verified.component';
import { AuthAccessDeniedComponent } from './auth-access-denied/auth-access-denied.component';
import { LoggedOutComponent } from './logged-out/logged-out.component';
import { FooterComponent } from './footer/footer.component';
import { SearchFormComponent } from './search-form/search-form.component';
import { StorageServiceModule} from 'angular-webstorage-service';

import * as Sentry from '@sentry/browser';
import {environment} from '../environments/environment';
import {SentryErrorHandler} from './handler/sentry.handler';

if (environment.SENTRY_ENABLED) {
  Sentry.init({
    dsn: 'https://b54a99cd8c9c4fe4968307ae9b294d8d@o378845.ingest.sentry.io/5218811',
    environment: environment.ENVIRONMENT_NAME
  });
}

@NgModule({
  declarations: [
    HomeComponent,
    RootComponent,
    SearchComponent,
    HeaderComponent,
    CallbackComponent,
    AuthErrorComponent,
    AuthVerifyEmailComponent,
    AuthEmailVerifiedComponent,
    AuthAccessDeniedComponent,
    LoggedOutComponent,
    FooterComponent,
    SearchFormComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgbModule,
    ReactiveFormsModule,
    HttpClientModule,
    StorageServiceModule

  ],
  providers: [AuthService, {provide: ErrorHandler, useClass: SentryErrorHandler}],
  bootstrap: [RootComponent]
})
export class AppModule { }
