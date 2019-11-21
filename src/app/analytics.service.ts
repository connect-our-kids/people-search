import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { HttpClient, HttpHeaders} from '@angular/common/http';
import { environment} from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {


  private emailAddress = 'anonymous@unknown.org';

  constructor(private auth: AuthService,
              private http: HttpClient) {}

  sendUserInfo(emailAddress: string) {

    if (window.location.href.indexOf('localhost') !== -1) {
      return;
    }

    this.emailAddress = emailAddress;

    const headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json; charset=utf-8');

    const bodyObject = new Object();
    bodyObject['emailAddress'] = emailAddress;

    if ( this.auth.isAuthenticated()) {
      bodyObject['authToken'] = this.auth.accessToken;
      bodyObject['idToken'] = this.auth.idToken;
    }

    this.http.post(
      environment.API_URL + '/api/sendUserInfo',
      JSON.stringify(bodyObject),
      {headers: headers}
    ).subscribe(
      (response) => {},
      (error) => {console.log(error); }
    );

  }

  sendEvent(verb: string, noun: string, outcome?: string, options?: object) {

    if (window.location.href.indexOf('localhost') !== -1) {
      return;
    }

    if (this.emailAddress == null) {
      console.warn('User email unknown, not sending analytic event');
      return;
    }


    let eventName = verb + '-' +  noun;
    if (outcome != null) {
      eventName += '-' + outcome;
    }

    this.sendIntercomEvents(eventName);

    const bodyObject = new Object();
    bodyObject['event'] = eventName;

    const headers = new HttpHeaders();
    headers.set('Content-Type', 'application/json; charset=utf-8');


    bodyObject['emailAddress'] = this.emailAddress;

    if (options != null) {
      bodyObject['options'] = options;
    }

    this.http.post(
      environment.API_URL + '/api/sendEvent',
      JSON.stringify(bodyObject),
      {headers: headers}
    ).subscribe(
      (response) => {},
      (error) => {console.log(error); }
    );
  }


  /** We want to track a limited number of events in Intercomm */
  private sendIntercomEvents(eventString: string) {


    // @ts-ignore
    if ( window.Intercom == null ) {
      return;
    }

    // tslint:disable-next-line:triple-equals
    if (eventString == 'search-person-success') {
      // @ts-ignore
      window.Intercom('trackEvent', 'people-search-search-person');
    }


  }

}
