import { Component, OnInit, OnDestroy } from '@angular/core';
import { BroadcastService, MsalService } from '@azure/msal-angular';
import { Logger, CryptoUtils } from 'msal';
import { Subscription } from 'rxjs';

// tslint:disable: max-line-length

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Microsoft Identity Platform';
  isIframe = false;
  loggedIn = false;
  private subscription = new Subscription();

  constructor(private broadcastService: BroadcastService, private authService: MsalService) { }

  ngOnInit() {
    this.isIframe = window !== window.parent && !window.opener;

    this.checkoutAccount();

    // NB: using unsubscribing technique shown here: https://medium.com/angular-in-depth/the-best-way-to-unsubscribe-rxjs-observable-in-the-angular-applications-d8f9aa42f6a0#0d9a
    this.subscription.add(this.broadcastService.subscribe('msal:loginSuccess', (payload) => {
      console.log(`loginSuccess event: ${JSON.stringify(payload)}`);
      this.checkoutAccount();
    }));

    this.subscription.add(this.broadcastService.subscribe('msal:loginFailure', (payload) => {
      console.log(`loginFailure event: ${JSON.stringify(payload)}`);
    }));

    this.subscription.add(this.broadcastService.subscribe('msal:acquireTokenSuccess', payload => {
      console.log(`acquireTokenSuccess event: ${JSON.stringify(payload)}`);
    }));

    // Regarding .handleRedirectCallback(), see: https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-handling-exceptions?tabs=javascript#error-types
    // "For error handling in authentication flows with redirect methods (loginRedirect, acquireTokenRedirect), you'll need to register the callback, which is called with success or failure after the redirect using handleRedirectCallback()"
    // See also: https://github.com/AzureAD/microsoft-authentication-library-for-js/wiki/FAQs#i-dont-understand-the-redirect-flow-how-does-the-handleredirectcallback-function-works
    this.authService.handleRedirectCallback((authError, response) => {
      console.log(`Inside handleRedirectCallback handler`);

      if (authError) {
        console.error('Redirect Error: ', authError.errorMessage);
        return;
      }

      console.log('Redirect Success: ', response.accessToken);
    });

    this.authService.setLogger(new Logger((logLevel, message, piiEnabled) => {
      console.log('MSAL Logging: ', message);
    }, {
      correlationId: CryptoUtils.createNewGuid(),
      piiLoggingEnabled: false
    }));
  }

  checkoutAccount() {
    this.loggedIn = !!this.authService.getAccount();
  }

  login() {
    const isIE = window.navigator.userAgent.indexOf('MSIE ') > -1 || window.navigator.userAgent.indexOf('Trident/') > -1;

    if (isIE) {
      this.authService.loginRedirect();
    } else {
      // See sign-in documentation: https://docs.microsoft.com/en-us/azure/active-directory/develop/scenario-spa-sign-in?tabs=angular
      // Temporal step 1): equivalent of oidc-client library method UserManager.signinRedirect(), but using popup instead of redirect flow.
      // The token is received by redirection to the root page (this same page, without needing a separate signin-redirect-callback component to coomplete the login process calling the token endpoint,
      // like the oidc-client library method UserManager.signinRedirectCallback() does.
      // NB: using the redirect login instead of popup one to be able see the sequence of Azure AD endpoints called in Chrome DevTools network tab:
      // this.authService.loginPopup().then(response => console.log(`Response promise from loginPopup() was: ${JSON.stringify(response)}`));
      this.authService.loginRedirect();
    }
  }

  logout() {
    this.authService.logout();
  }

  ngOnDestroy(): void {
    // NB: this app root component is never destroyed (nor reinitialized) hence this method is never called: adding it just to demonstrate how to unsubscribe from multiple subscriptions
    // (cannot use the better .takeUntil() technique due to the non-idiomatic implementation of BroadcastService.subscribe() )
    // NB: why is the following line needed? https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/angular-1.0-release/lib/msal-angular#4-subscribe-to-event-callbacks
    this.broadcastService.getMSALSubject().next(1);

    if (this.subscription) {
      console.log('Unsubscribing broadcastService subscriptions');
      this.subscription.unsubscribe();
    }
  }

}


/*
Call stacks of MSAL Angular into MSAL.js (more precisely from msal-angular folder 1.0.0 into msal-core folder 1.3.0 of this repository: https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/angular-1.0-release)

- loginPopup() call stack:
    MsalService.loginPopup()    NB: MsalService derives from UserAgentApplication (for Typescript inheritance see: https://www.typescriptlang.org/docs/handbook/classes.html#inheritance)
    which calls:
    UserAgentApplication.loginPopup()  --> this returns a manually created promise which gets completed by the acquireTokenInteractive() method. TODO: investigate if creating a promise using entirely synchornous code is an antipattern?
    which calls:
    UserAgentApplication.acquireTokenInteractive()
    which calls:
    UserAgentApplication.acquireTokenHelper() --> this also "registers" somewhere the resolve/reject callsbacks that make the constructed promise complete
    which calls:
    UserAgentApplication.openPopup()
    which calls:
    window.open()  --> this actually opens the popup.
    after the window.open() method, the parent method .acquireTokenHelper() calls:
    UserAgentApplication.navigateWindow() --> which navigates the popup windwow to the authorize endpoint


- loginRedirect() call stack (better in order to be able to see the sequence of actual HTTP calls agains Azure AD endpoints):
    MsalService.loginRedirect()
    which calls (well, it is an inherited method):
    UserAgentApplication.loginRedirect()
    which calls:
    UserAgentApplication.acquireTokenInteractive()
    which calls:
    UserAgentApplication.acquireTokenHelper()
    which calls:
    UserAgentApplication.navigateWindow() --> this navigates to the authorize endpoint


- sequence of HTTP calls seen when performing login (see explanations here: https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-implicit-grant-flow#send-the-sign-in-request. NB: use .loginRedirect() instead of .loginPopup() to see these)
    https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration
    then:
    https://login.microsoftonline.com/common/oauth2/v2.0/authorize?response_type=id_token&scope=openid%20profile&client_id=XXX&redirect_uri=http%3A%2F%2Flocalhost%3A4200%2F&state=YYY&nonce=ZZZ&client_info=1&x-client-SKU=MSAL.JS&x-client-Ver=1.3.1&client-request-id=KKK&response_mode=fragment
    then user enter credentials in Azure AD login form, then:
    https://login.live.com/oauth20_authorize.srf?client_id=XXX&scope=openid+profile&redirect_uri=http%3a%2f%2flocalhost%3a4200%2f&response_type=id_token&state=YYY&response_mode=fragment&nonce=ZZZ&x-client-SKU=MSAL.JS&x-client-Ver=1.3.1&uaid=AAA&msproxy=1&issuer=mso&tenant=common&ui_locales=en-GB&client_info=1&username=mymsXXXmail.com
    then POST to:
    https://login.live.com/ppsecure/post.srf?client_id=XXX&scope=openid+profile&redirect_uri=http%3a%2f%2flocalhost%3a4200%2f&response_type=id_token&state=YYY&response_mode=fragment&nonce=ZZZ&x-client-SKU=MSAL.JS&x-client-Ver=1.3.1&msproxy=1&issuer=mso&tenant=common&ui_locales=en-GB&client_info=1&username=mymsXXXmail.com&contextid=BBB&bk=CCC&uaid=DDD&pid=EEE
    which redirects (via a 302 status code) to the home address with the id_token in the hash:
    http://localhost:4200/#id_token=HHH
    NB: the token following the hash seems to be extracted by method "UserAgentApplication.handleRedirectAuthenticationResponse()"

- sequence of HTTP calls seen when refreshing the access token (NB: if running website in Chrome Incognito window, need to switch from "Block third-party cookies in Incognito" to "Allow all cookies"):
   https://login.microsoftonline.com/[tenantId]/oauth2/v2.0/authorize?response_type=token&scope=api%3A%2F%2F[applicationId]%2Faccess_as_user%20openid%20profile&client_id=XXX&redirect_uri=http%3A%2F%2Flocalhost%3A4200%2F&state=GGG&nonce=LLL&client_info=1&x-client-SKU=MSAL.JS&x-client-Ver=1.3.1&login_hint=mymsXXXmail.com&client-request-id=MMM&prompt=none&response_mode=fragment
   which redirects (via a 302 status code) to:
   https://login.live.com/oauth20_authorize.srf?client_id=XXX&scope=api%3a%2f%2f[applicationId]%2faccess_as_user+openid+profile&redirect_uri=http%3a%2f%2flocalhost%3a4200%2f&response_type=token&state=GGG&response_mode=fragment&nonce=LLL&prompt=none&login_hint=mymsXXXmail.com&x-client-SKU=MSAL.JS&x-client-Ver=1.3.1&uaid=NNN&msproxy=1&issuer=mso&tenant=[tenant]&ui_locales=en-GB&client_info=1
   which redirects (via a 302 status code) to:
   http://localhost:4200/#access_token=PPP&token_type=bearer&expires_in=3600&scope=api://[applicationId]/access_as_user&client_info=QQQ&state=GGG


- token renewal call stack, performed by MsalInterceptor:
    MsalInterceptor.intercept()
    which calls:
    MsalService.acquireTokenSilent()
    which calls:
    UserAgentApplication.acquireTokenSilent(): https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/angular-1.0-release/lib/msal-core/src/UserAgentApplication.ts#L632
     Description: "Use this function to obtain a token before every call to the API / resource provider. MSAL return's a cached token when available or it send's a request to the STS to obtain a new token using a hidden iframe."
    which calls:
    UserAgentApplication.renewToken(): https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/angular-1.0-release/lib/msal-core/src/UserAgentApplication.ts#L1342
     Description: "Acquires access token using a hidden iframe."
     It logs (verbose level): "renewToken is called for scope and authority:". It also add the query string "&prompt=none" to the url.
    which calls:
    UserAgentApplication.loadIframeTimeout(): https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/angular-1.0-release/lib/msal-core/src/UserAgentApplication.ts#L830
     Description: "Calling _loadFrame but with a timeout to signal failure in loadframeStatus. "
     It logs (verbose level): "Set loading state to pending for:"
    which calls:
    WindowUtils.addHiddenIFrame(): https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/angular-1.0-release/lib/msal-core/src/utils/WindowUtils.ts#L154
     Description: "Adds the hidden iframe for silent token renewal."
     It logs (info level): "Add msal frame to document:"
*/
