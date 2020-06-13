
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms'
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';

import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon'
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

import { Configuration, CacheLocation } from 'msal';
import {
  MsalModule,
  MsalInterceptor,
  MSAL_CONFIG,
  MSAL_CONFIG_ANGULAR,
  MsalService,
  MsalAngularConfiguration
} from '@azure/msal-angular';

import * as config from './app-config.json';
import { AppRoutingModule } from './app-routing.module';
import { HomeComponent } from './home/home.component';
import { TodoService } from './todo.service';
import { AppComponent } from './app.component';
import { TodoEditComponent } from './todo-edit/todo-edit.component';
import { TodoViewComponent } from './todo-view/todo-view.component';

// tslint:disable: max-line-length

// MSAL Angular public API methods: https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-angular#msal-angular-public-api
//    (and tutorial here: https://docs.microsoft.com/en-gb/azure/active-directory/develop/tutorial-v2-angular)
// Explanation of using authentication methods with redirect flow (e.g. loginRedirect()): https://github.com/AzureAD/microsoft-authentication-library-for-js/wiki/FAQs#i-dont-understand-the-redirect-flow-how-does-the-handleredirectcallback-function-works
//    and here: https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-js-initializing-client-applications#initializing-applications
//    (for popup browser window theory, see pag 354 of "JavaScript: The Definitve Guide" pdf, or https://javascript.info/popup-windows)
// MSAL.js token renewal explained here: https://github.com/AzureAD/microsoft-authentication-library-for-js/wiki/FAQs#how-do-i-renew-tokens-with-msaljs and here: https://github.com/AzureAD/microsoft-authentication-library-for-js/wiki/FAQs#how-long-do-tokens-last-how-long-are-they-valid-for
//    (important to quote: "The library does not automatically invoke the acquireTokenSilent method. It is recommended that you call acquireTokenSilent in your app before making an API call to get the valid token.",
//     however for MSAL Angular this is done automatically via the HTTP interceptor: https://docs.microsoft.com/en-us/azure/active-directory/develop/scenario-spa-call-api?tabs=angular,
//     see interceptor source code: https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/angular-1.0-release/lib/msal-angular/src/msal.interceptor.ts#L34.
//     This is also relevant, regarding the implicit flow: https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-implicit-grant-flow#refreshing-tokens
//     "The implicit grant does not provide refresh tokens. Both id_tokens and access_tokens will expire after a short period of time, so your app must be prepared to refresh these tokens periodically.")
//    (Suggestion to use a "simple page" that does not require authentication as redirect_uri: https://github.com/AzureAD/microsoft-authentication-library-for-js/wiki/FAQs#how-to-avoid-page-reloads-when-acquiring-and-renewing-tokens-silently
// Changing token lifetime requires a paid feature Azure feature "Conditional Access Policy": https://docs.microsoft.com/en-gb/azure/active-directory/conditional-access/howto-conditional-access-session-lifetime
//    (the old Powershell way was: https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-configurable-token-lifetimes#token-lifetime-policy-properties)

// MSAL Angular: PR for supporting authorization code flow with PKCE: https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/1000
// Non-Angular PKCE version of MSAL.js library is called "@azure/msal-browser": https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-browser#oauth-20-and-the-implicit-flow-vs-authorization-code-flow-with-pkce
// Great "Identity for Developers" playlist: https://www.youtube.com/playlist?list=PLLasX02E8BPBxGouWlJV-u-XZWOc2RkiX
// (here explaining the typical pattern of acquireTokenSilent()/failure/acquireTokenPopup(): https://youtu.be/Mtpx_lpfRLs?t=560 and here: https://youtu.be/KoOCIwUDpjI?t=558
// (here explaining the "/.default" scope: https://youtu.be/toAWRNqqDL4?t=1275 and scopes in general here: https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent#scopes-and-permissions)
// (here explaining how a WebAPI should perform access token validation: https://youtu.be/IIQ7QW4bYqA?t=445)
// "Microsoft identity platform best practices for developers": https://www.youtube.com/watch?v=KoOCIwUDpjI (e.g. explaining scopes again here: https://youtu.be/KoOCIwUDpjI?t=849)
// "Develop multi-tenant applications with Microsoft identity platform-April 2020" (explaining the meaning of "/Common" "/Consumer" and "/Organizations" authority: https://youtu.be/B416AxHoMJ4?t=1278)
// WPF MSAL desktop app used in various Microsoft identity videos: https://github.com/kylemar/BestPracticesDemo (my fork here: https://github.com/mbassit/BestPracticesDemo/commits/master)
// "[Short] Why migrate your app from v1.0 to v2.0 endpoint in Azure AD? | One Dev Question: Jean-Marc Prieur": https://www.youtube.com/watch?v=qpdC45tZYDg&feature=emb_title
//    (MSAL supports v2 endpoints, which are OpenID Connect compliant (v1 was not) and allow for consumer accounts (in addition to work/school accounts) to be used as well)
// "[Short] What are scopes within the Microsoft identity platform? | One Dev Question: Jean-Marc Prieur": https://www.youtube.com/watch?time_continue=47&v=eiPHOoLmGJs&feature=emb_title
// "[Short] What's the role of redirect URI within the identity platform? | One Dev Question: Jean-Marc Prieur": https://www.youtube.com/watch?time_continue=30&v=znSN_3JAuoU&feature=emb_title
// To see and manage list of apps that a given Microsoft account has given permissions to: https://account.live.com/consent/Manage

// TODO:
// -create GitHub PR with: added spinner when retrieving values, and show/clear error in UI
// -create GitHub PR to unsubscribe from event callbacks: https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-angular#4-subscribe-to-event-callbacks
// -create GitHub PR to fix Angular tests if broken
// -create GitHub PR after investigating if the MSAL Angular interceptor should have an error handler for the acquireTokenSilent() method?: https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/angular-1.0-release/lib/msal-angular/src/msal.interceptor.ts#L34
// (and perhaps add unit tests for that error  case in the PR)

// checks if the app is running on IE
export const isIE = window.navigator.userAgent.indexOf('MSIE ') > -1 || window.navigator.userAgent.indexOf('Trident/') > -1;

export const protectedResourceMap: [string, string[]][] = [
  [config.resources.todoListApi.resourceUri, [config.resources.todoListApi.resourceScope]]
];
// See MSAL.js configuration documentation: https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-js-initializing-client-applications
function MSALConfigFactory(): Configuration {
  return {
    auth: {
      clientId: config.auth.clientId,
      authority: config.auth.authority,
      validateAuthority: true,
      redirectUri: config.auth.redirectUri,
      postLogoutRedirectUri: config.auth.postLogoutRedirectUri,
      navigateToLoginRequestUrl: true,
    },
    cache: {
      cacheLocation: <CacheLocation>config.cache.cacheLocation,
      storeAuthStateInCookie: isIE, // set to true for IE 11
    },
  };
}

// NB: setting the "MsalAngularConfiguration.popUp" property to false to always use the redirect flow in the whole app, even by the MsalGuard
//    (this is where the guard uses it: https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/angular-1.0-release/lib/msal-angular/src/msal-guard.service.ts#L55._mat-animation-noopable
//     The guard itself performs the log in if the user is not already logged when browsing to a protected page, see line #85 on same source code hyperlink above).
// NB: the MsalInterceptor will not add a bearer token to requests going to the urls listed in the "MsalAngularConfiguration.unprotectedResources" property below: https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/angular-1.0-release/lib/msal-angular/src/msal.interceptor.ts#L26
function MSALAngularConfigFactory(): MsalAngularConfiguration {
  return {
    popUp: false,
    consentScopes: [
      config.resources.todoListApi.resourceScope,
      ...config.scopes.loginRequest
    ],
    unprotectedResources: [],
    protectedResourceMap,
    extraQueryParameters: {}
  };
}

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    TodoEditComponent,
    TodoViewComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    MatToolbarModule,
    MatButtonModule,
    MatListModule,
    MatCardModule,
    AppRoutingModule,
    MsalModule,
    FormsModule,
    MatInputModule,
    MatTableModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatIconModule,
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true
    },
    {
      provide: MSAL_CONFIG,
      useFactory: MSALConfigFactory
    },
    {
      provide: MSAL_CONFIG_ANGULAR,
      useFactory: MSALAngularConfigFactory
    },
    MsalService,
    TodoService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
