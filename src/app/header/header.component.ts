import {AfterViewInit, Component, ElementRef, Inject, OnInit, Output, ViewChild} from '@angular/core';
import {AuthService} from '../auth.service';
import {Router} from '@angular/router';
import {AnalyticsService} from '../analytics.service';
import {NgbModal, NgbTooltip} from '@ng-bootstrap/ng-bootstrap';
import {ChildServedService} from '../child-served.service';
import {LOCAL_STORAGE, SESSION_STORAGE, WebStorageService} from 'angular-webstorage-service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, AfterViewInit {


  ChildServedModalResult = ChildServedModalResult;

  @ViewChild('socialWorkerCheckModal') socialWorkerCheckModal: ElementRef;
  @ViewChild('watchVideoModal') watchVideoModal: ElementRef;
  @ViewChild('videoModal') videoModal: ElementRef;
  @ViewChild('notASocialWorkerModal') notASocialWorkerModal: ElementRef;
  @ViewChild('childServedModal') childServedModal: NgbModal;

  @ViewChild('servingChildToolTip') servingChildToolTip: NgbTooltip;

  constructor(
    private auth: AuthService,
    private router: Router,
    private analytics: AnalyticsService,
    private modal: NgbModal,
    private childServed: ChildServedService,
    @Inject(SESSION_STORAGE) private sessionStorage: WebStorageService

  ) { }

  ngOnInit(): void {
  }

  ngAfterViewInit() {

    setTimeout(() => {

      if (this.sessionStorage.get('servingChildToolTip') !== true) {

        if (this.servingChildToolTip != null)  {
          this.servingChildToolTip.open();
          setTimeout(() => {this.servingChildToolTip.close(); }, 5000);
          this.sessionStorage.set('servingChildToolTip', true);
        }
      }
    }, 1000);


  }

  login() {
    this.analytics.sendEvent('click', 'login');
    this.auth.login();
  }
  logout() {
    this.analytics.sendEvent('click', 'logout');
    this.auth.logout();
  }

  logoClick() {
    this.analytics.sendEvent('click', 'logo');
    this.router.navigate(['/']);
  }

  isAuthenticated() {
    return this.auth.isAuthenticated();
  }

  visitConnectOurKids() {
    this.analytics.sendEvent('click', 'go-to-connectourkids-website');
    window.location.href = 'https://www.connectourkids.org/';
  }

  register() {
    this.analytics.sendEvent('click', 'sign-up');
    this.openSocialWorkerCheckModal();
  }

  public openSocialWorkerCheckModal() {
    this.modal.open(this.socialWorkerCheckModal, {backdrop: 'static'});
  }

  yesIAmASocialWorkerClick() {
    this.analytics.sendEvent('click', 'yes-i-am-a-social-worker');

    this.modal.dismissAll();
    this.modal.open(this.watchVideoModal, {backdrop: 'static'});
  }

  openVideoClick() {
    this.analytics.sendEvent('click', 'watch-video');
    this.modal.dismissAll();

    this.modal.open(this.videoModal,  {
          size: 'lg',
          backdrop: 'static',
          centered: true,
          beforeDismiss: () => {
            this.analytics.sendEvent('close', 'introduction-video');
            return true;
          }});
  }

  dontWatchVideoClick() {
       this.analytics.sendEvent('click', 'do-not-watch-video');
       this.auth.register();
  }

  noIAmNotASocialWorkerClick() {
    this.modal.dismissAll();
    this.analytics.sendEvent('click', 'i-am-not-a-social-worker');
    this.modal.open(this.notASocialWorkerModal, {backdrop: 'static'});

  }

  postWatchVideoSignUp() {
      this.analytics.sendEvent('click', 'post-watch-video-sign-up');
      this.auth.register();
  }

  childServedClick() {
      this.showThanksForServingFosterKids();
      this.servingChildToolTip.close();
  }
  showThanksForServingFosterKids() {
    this.modal.open(this.childServedModal, {backdrop: 'static'}).result.then(
      result => {
        if ( result === ChildServedModalResult.EXIT) {
          this.childServed.childServed();

        } else {

        }
      }
    );

  }


}

enum ChildServedModalResult {
  EXIT,
  CANCEL
}
