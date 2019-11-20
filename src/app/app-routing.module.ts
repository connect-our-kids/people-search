import { NgModule } from '@angular/core';
import {Routes, RouterModule } from '@angular/router';
import {HomeComponent} from './home/home.component';
import {SearchComponent} from './search/search.component';
import {AuthErrorComponent} from './auth-error/auth-error.component';
import {AuthVerifyEmailComponent} from './auth-verify-email/auth-verify-email.component';
import {CallbackComponent} from './callback/callback.component';
import {AuthAccessDeniedComponent} from './auth-access-denied/auth-access-denied.component';
import {LoggedOutComponent} from './logged-out/logged-out.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'search', component: SearchComponent},
  { path: 'auth-error', component: AuthErrorComponent},
  { path: 'verify-email', component: AuthVerifyEmailComponent},
  { path: 'callback', component: CallbackComponent},
  { path: 'request-access', component: AuthAccessDeniedComponent},
  { path: 'logged-out', component: LoggedOutComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
