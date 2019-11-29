import {Component, ElementRef, EventEmitter, Inject, OnInit, Output, ViewChild} from '@angular/core';
import {environment} from '../../environments/environment';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {ActivatedRoute, Router} from '@angular/router';
import {AuthService} from '../auth.service';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {AnalyticsService} from '../analytics.service';
import {Title} from '@angular/platform-browser';
import {HeaderComponent} from '../header/header.component';
import {SearchFormComponent, SearchType, SearchValidationResult} from '../search-form/search-form.component';
import {LOCAL_STORAGE, WebStorageService} from 'angular-webstorage-service';
import {ChildServedService} from '../child-served.service';



@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit {


  ModalResult = ModalResult;

  searchValidationResult: SearchValidationResult = null;

  ViewState = ViewState;
  viewState = ViewState.NO_SEARCH;

  @ViewChild('urlActionModal') urlActionModal: NgbModal;
  @ViewChild('addressActionModal') addressActionModal: NgbModal;
  @ViewChild('emailActionModal') emailActionModal: NgbModal;
  @ViewChild('phoneActionModal') phoneActionModal: NgbModal;
  @ViewChild('childSupportedModal') childSupportedModal: NgbModal;
  @ViewChild('whyAmIBeingAskedModal') whyAmIBeingAskedModal: NgbModal;
  @ViewChild('afterChildSupportedModal') afterChildSupportedModal: NgbModal;

  @ViewChild('header') header: HeaderComponent;
  @ViewChild('searchForm') searchForm: SearchFormComponent;



  searchResult = null;

  private sub = null;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService,
    private modal: NgbModal,
    private analytics: AnalyticsService,
    private childServed: ChildServedService,
    private title: Title,
    @Inject(LOCAL_STORAGE) private webStorage: WebStorageService
  ) { }


  ngOnInit() {
    this.sub = this.route.params.subscribe(params => {
       this.parametersChanged(params);
    });
  }

  searchFormUpdated() {

    this.viewState = ViewState.SEARCH_LOADING;

    this.searchValidationResult = this.searchForm.validateSearch();

    if (!this.searchValidationResult.valid) {
      this.viewState = ViewState.QUERY_NOT_VALID;
      return;
    }

    const searchObject = this.searchForm.getSearchObject(this.searchValidationResult);

    // Wait until the authentication time is ready
    this.auth.waitForAuthReady().then(
      authenticated => {
      this.fetchSearchPostWaitForAuth(searchObject, authenticated);
    });
  }


  parametersChanged(params) {
  }

  fetchSearchPostWaitForAuth(searchObject, authenticated) {

    if (authenticated) {
      const notPreviouslyShown: boolean = this.webStorage.get('inSupportOfChildShown') === null;

      if (notPreviouslyShown) {
        this.openInSupportOfChildModal();
        this.webStorage.set('inSupportOfChildShown', true);
      }
    }



    const requestObject = {};

    if (authenticated) {
      requestObject['authToken'] = this.auth.accessToken;
      requestObject['idToken'] = this.auth.idToken;
    }

    if (searchObject['search_pointer_hash'] != null) {
      requestObject['search_pointer_hash'] = searchObject['search_pointer_hash'];
    } else {
          requestObject['person'] = encodeURI(JSON.stringify(searchObject));
    }

    const searchUrl = environment.API_URL + '/api/search-v2';

    const headers = new HttpHeaders();
    headers.set('Content-Type', 'text/json; charset=utf-8');

    const responseObservable =  this.http.post(
      searchUrl,
      JSON.stringify(requestObject),
      {headers: headers}
    );

    responseObservable.subscribe( (response ) => {

      this.searchResult = response;

      if (this.searchResult.person == null
        && this.searchResult.possible_persons == null) {
        this.viewState = ViewState.NO_RESULTS;
        this.title.setTitle('No results - ' + environment.APP_NAME);
      } else {
        this.viewState = ViewState.SEARCH_RESULT;

        if (this.searchResult.person != null
            && this.searchResult.person.names != null) {

          const name = this.searchResult.person.names[0];

          let personName = name.first;
          if (name.middle != null && name.middle.trim().length > 0) {
            personName += ' ' + name.middle;
          }
          personName += ' ' + name.last;

          this.title.setTitle(personName + ' - ' + environment.APP_NAME);
        } else {
          const title = this.searchForm.getTitle();
          this.title.setTitle('Search: ' + title + ' - ' + environment.APP_NAME);
        }
      }

      this.analytics.sendEvent('search', 'person', 'success',
        {
          'possibleMatches': this.searchResult.possible_persons != null ? this.searchResult.possible_persons.length : 0,
          'personMatch': this.searchResult.person != null,
        }
      );

    }, (error) => {
        this.viewState = ViewState.SEARCH_ERROR;
        console.error('Error during person search');
        console.error(error);
        this.analytics.sendEvent('search', 'person', 'failed', error);
      });
  }

  sortGeneric(items): [] {

    return items;
    return items.sort((aItem, bItem) => {
      if (aItem === bItem) {
        return;
      }

      const a = this.getLastSortDate(aItem);
      const b = this.getLastSortDate(bItem);

      return a > b ? -1 : a < b ? 1 : 0;

    });
  }

  getLastSortDate(item): Date {
    if (item == null) {
      return new Date(0, 0, 0, 0, 0, 0, 0);
    }

    if (item['@last_seen'] != null) {
      return new Date(item['@last_seen']);
    }

    if (item['@valid_since'] != null) {
      return new Date(item['@valid_since']);
    }

    return new Date(0, 0, 0, 0, 0, 0, 0);

  }

  filterPhones(phones) {
    return this.sortGeneric(phones);
  }

  filterAddresses(addresses) {
    return this.sortGeneric(addresses);
  }

  filterEmails(emails) {
    return this.sortGeneric(emails);
  }

  filterUrls(urls) {
    if (urls == null) {
      return [];
    }

    const returnValue = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];

      if (url.url == null) {
        continue;
      }

      if (url['@name'] == null) {
        continue;
      }

      if (url['@sponsored'] === true) {
        continue;
      }

      returnValue.push(url);
    }

    return this.sortGeneric(returnValue);
  }

  filterRelationships(relationships) {
    if (relationships == null) {
            return [];
    }

    const returnValue = [];

    for (const relationship of relationships) {
      returnValue.push(relationship);
    }


    return this.sortGeneric(returnValue);

  }

  relationshipClick(relationship) {

    const index = this.searchResult.person.relationships.indexOf(relationship);

    if (!this.auth.isAuthenticated()) {
      this.header.openSocialWorkerCheckModal();
      return;
    }

    this.analytics.sendEvent('click', 'relationship', null,
        {
          'relationshipIndex': index
        }
    );


    let personName = this.searchResult.person.names[0].first;
    personName += ' ' + this.searchResult.person.names[0].last;


    window.open('/search;t=' + SearchType.NAME + ';m=' + relationship.names[0].display + ';r=' + personName);
    // this.router.navigate(['/search', { t: SearchType.NAME, m: relationship.names[0].display, r: personName}]);

    // window.scroll(0, 0);

  }


  generateProfileUrl(profile) {

    const values = profile.content.split('@');

    if (values[1] === 'facebook') {
      return 'https://www.facebook.com/' + values[0];
    }

    if (values[1] === 'linkedin') {
      return 'https://www.linkedin.com/in/' + values[0];
    }

    if (values[1] === 'google') {
      return ' https://plus.google.com/' + values[0] + '/posts';
    }

    return '';


  }

  generateProfileName(profile) {
        const values = profile.content.split('@');

    if (values[1] === 'facebook') {
      return 'Facebook';
    }

    if (values[1] === 'linkedin') {
      return 'Linked-In';
    }

    if (values[1] === 'google') {
      return 'Google Plus';
    }

    return values[0] + '@' + values[1];
  }

  uniqueCityStates(addresses) {

    const returnValues = [];

    if (addresses == null) {
      return returnValues;
    }


    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      let value = (address.city != null) ? address.city : '';

      if (address.state != null && address.state !== '') {
        if (value !== '') {
          value += ',';
        }

        value += address.state;
      }

      if (returnValues.indexOf(value) === -1) {
        returnValues.push(value);
      }
    }

    return returnValues;
  }

  logoClick() {
    this.router.navigate(['/']);
  }

  generatePersonLink(person) {
    return '/search;person=' + person['@search_pointer_hash'];
  }

  generateThumbnailUrl(person) {
    if (person.images == null || person.images.length === 0) {
      return environment.API_URL + '/api/thumbnail?tokens=none';
    }

    let tokens = '';
    person.images.forEach((image) => {
      if (tokens !== '') {
        tokens += ',';
      }

      tokens += image.thumbnail_token;
    });

    const url =  environment.API_URL + '/api/thumbnail?tokens=' + tokens;

    console.log(url);

    return url;
  }

  personClick($event, person) {

    // Find the index of the person clicked
    const index = this.searchResult.possible_persons.indexOf(person);

    this.analytics.sendEvent('click', 'possible_person', null,
        {
          'possiblePersonIndex': index
        }
    );

    if ($event.shiftKey
        || $event.metaKey) {
            return;
    }

    this.router.navigate(['/search', { person: person['@search_pointer_hash']}]);

  }

  translateWarningMessage(message) {
    if (message.indexOf('could not be parsed to a searchable address') !== -1) {
      return 'The location was not recognized. Try entering a city name and two letter state abbreviation separated by a comma.';
    }
    return message;
  }

  urlClick(url) {

    const index = this.searchResult.person.urls.indexOf(url);

    if (!this.auth.isAuthenticated()) {
      this.header.openSocialWorkerCheckModal();
      return;
    }

    this.modal.open(this.urlActionModal, {backdrop: true}).result.then(
      result => {
        if ( result === ModalResult.ACTION ) {

          this.analytics.sendEvent('click', 'person_url_view', null,
              {
                'urlIndex': index
              }
          );

          window.open(url.url, '_blank');
        } else {

          this.analytics.sendEvent('click', 'person_url_search', null,
              {
                'urlIndex': index
              }
          );

          window.open( '/search;t=url;m=' + encodeURIComponent(url.url));

        }
      }
    ).catch(e => {
        console.log(e);
    });

  }

  addressClick(address) {
    const index = this.searchResult.person.addresses.indexOf(address);

    if (!this.auth.isAuthenticated()) {
      this.header.openSocialWorkerCheckModal();
      return;
    }

    this.modal.open(this.addressActionModal, {backdrop: true}).result.then(
      result => {
        if ( result === ModalResult.ACTION ) {

          this.analytics.sendEvent('click', 'person_address_view', null,
              {
                'addressIndex': index
              }
          );

          window.open('https://www.google.com/maps/search/?api=1&query=' + address.display, '_blank');

        } else {

          this.analytics.sendEvent('click', 'person_address_search', null,
              {
                'addressIndex': index
              }
          );


          window.open('/search;t=address;m=' + encodeURIComponent(address.display), '_blank');

        }
      }
    ).catch(e => {
        console.log(e);
    });

  }

  emailClick(email) {
    const index = this.searchResult.person.emails.indexOf(email);

    if (!this.auth.isAuthenticated()) {
      this.header.openSocialWorkerCheckModal();
      return;
    }

    this.modal.open(this.emailActionModal, {backdrop: true}).result.then(
      result => {
        if ( result === ModalResult.ACTION ) {

        this.analytics.sendEvent('click', 'person_email_send', null,
            {
              'emailIndex': index
            }
        );

        window.location.href = 'mailto:' + email.address;

        } else {

          this.analytics.sendEvent('click', 'person_email_search', null,
              {
                'emailIndex': index
              }
          );

          window.open('/search;t=email;m=' + encodeURIComponent(email.address), '_blank');

        }
      }
    ).catch(e => {
        console.log(e);
    });

  }

  phoneClick(phone) {
    const index = this.searchResult.person.phones.indexOf(phone);

    if (!this.auth.isAuthenticated()) {
      this.header.openSocialWorkerCheckModal();
      return;
    }

    this.modal.open(this.phoneActionModal, {backdrop: true}).result.then(
      result => {
        if ( result === ModalResult.ACTION ) {

          this.analytics.sendEvent('click', 'person_phone_call', null,
              {
                'phoneIndex': index
              }
          );

          window.location.href = 'tel:' + phone.country_code + ' ' + phone.display;

        } else {
          this.analytics.sendEvent('click', 'person_phone_search', null,
              {
                'phoneIndex': index
              }
          );

          window.open('/search;t=phone;m=' + encodeURIComponent(phone.display), '_blank');
        }
      }
    ).catch(e => {
        console.log(e);
    });

  }

  generateRelationshipDisplay(relationship) {
    if (!this.auth.isAuthenticated()) {
      return '**** ********* **';
    }

    return relationship.names[0]['display'];
  }

  generateAddressHomeStreetDisplay(address) {
    if (!this.auth.isAuthenticated()) {
      return '**** ********* **';
    }

    let returnValue = '';

    if (address.house != null) {
      returnValue += address.house;
    }

    if (address.street != null) {

      if (returnValue !== '') {
        returnValue += ' ';
      }

      returnValue += address.street;
    }

    return returnValue;
  }


  generateAddressZipcodeDisplay(address) {
    if (!this.auth.isAuthenticated()) {
      return '*****';
    }

    return address.zip_code;
  }

  generatePhoneDisplay(phone) {
    if (!this.auth.isAuthenticated()) {
      return phone.country_code + '-' + phone.display.substring(0, 9) + '***';
    }
    return phone.country_code + '-' + phone.display;
  }

  authenticated() {
    return this.auth.isAuthenticated();
  }


  openInSupportOfChildModal() {
    this.modal.open(this.childSupportedModal, {backdrop: 'static'} ).result.then(
      result => {
        if ( result === ModalResult.YES) {
          this.childServed.childServed();
        } else {
        }

        this.modal.open(this.afterChildSupportedModal, {backdrop: 'static'});
      }
    );
  }


  whyAmIBeingAskedClicked() {
    this.analytics.sendEvent('open', 'why-am-i-being-asked-modal');
    this.modal.open(this.whyAmIBeingAskedModal, {backdrop: 'static'}).result.then(
      result => {
      }
    );
  }





}



enum ModalResult {
  ACTION,
  SEARCH,
  YES,
  NO
}

enum ViewState {
  NO_SEARCH,
  SEARCH_LOADING,
  SEARCH_RESULT,
  SEARCH_ERROR,
  QUERY_NOT_VALID,
  NO_RESULTS
}


