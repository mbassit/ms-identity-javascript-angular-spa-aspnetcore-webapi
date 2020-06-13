import { TodoService } from './../todo.service';
import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { BroadcastService, MsalService } from '@azure/msal-angular';
import { InteractionRequiredAuthError, AuthError } from 'msal';
import * as config from '../app-config.json';
import { Todo } from '../todo';

// tslint:disable: max-line-length

@Component({
  selector: 'app-todo-view',
  templateUrl: './todo-view.component.html',
  styleUrls: ['./todo-view.component.css']
})
export class TodoViewComponent implements OnInit {
  todo: Todo;

  todos: Todo[];

  displayedColumns = ['status', 'description', 'edit', 'remove'];
  errorMessage = '';

  constructor(private authService: MsalService, private service: TodoService, private broadcastService: BroadcastService) { }

  ngOnInit(): void {
    this.broadcastService.subscribe('msal:acquireTokenSuccess', (payload) => {
      console.log(payload);
      console.log('access token acquired: ' + new Date().toString());

    });

    this.broadcastService.subscribe('msal:acquireTokenFailure', (payload) => {
      console.log(payload);
      console.log('access token acquisition fails');
    });

    this.getTodos();
  }

  getTodos(): void {
    this.errorMessage = '';
    this.service.getTodos().subscribe({
      next: (response: Todo[]) => {
        this.todos = response;
      },
      error: (err: AuthError) => {
        this.errorMessage = `${err.message}`;

        // See error handling documentation: https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-handling-exceptions?tabs=javascript
        // If there is an interaction required error,  call one of the interactive methods and then make the request again.
        // The 'isInteractionRequiredError()' method will simply check if the 'errorCode' string is one of these 3: "interaction_required", "consent_required" or "login_required", see: https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/angular-1.0-release/lib/msal-common/src/error/InteractionRequiredAuthError.ts#L12
        // (NB: the 'errorCode' is a custom property present in the MSAL-specific error class AuthError)
        if (InteractionRequiredAuthError.isInteractionRequiredError(err.errorCode)) {
          // See acquiring token documentation: https://docs.microsoft.com/en-us/azure/active-directory/develop/scenario-spa-acquire-token?tabs=angular
          // and recommended code pattern: https://docs.microsoft.com/en-gb/azure/active-directory/develop/tutorial-v2-angular#acquire-a-token
          // See calling api documentation: https://docs.microsoft.com/en-us/azure/active-directory/develop/scenario-spa-call-api?tabs=angular
          this.authService.acquireTokenPopup({
            scopes: this.authService.getScopesForEndpoint(config.resources.todoListApi.resourceUri)
          })
          .then((authResponse) => {
            console.log(`Response promise from acquireTokenPopup() was: ${JSON.stringify(authResponse)}`);
            this.errorMessage = '';
            this.service.getTodos()
                .toPromise()
                .then((response: Todo[])  => {
                  this.todos = response;
                },
                error => {
                  // NB: for Javascript promises it is advised to use the .catch() error handling pattern instead of the .then() onrejected handler (in this case the onfulfilled handler cannot fail, so it makes no difference), see:
                  // https://github.com/getify/You-Dont-Know-JS/blob/1st-ed/async%20%26%20performance/ch3.md#error-handling
                  this.errorMessage = error.message;
                });
            });
        }
      }
    });
  }

  addTodo(add: NgForm): void {
    this.errorMessage = '';
    this.service.postTodo(add.value).subscribe(() => {
      this.getTodos();
    },
    error => this.errorMessage = error.message);
    add.resetForm();
  }

  checkTodo(todo): void {
    this.errorMessage = '';
    this.service.editTodo(todo).subscribe({
      error: error => this.errorMessage = error.message  // NB: here using new RxJS observer syntax: https://stackoverflow.com/a/55472361
     });
  }

  removeTodo(id): void {
    this.errorMessage = '';
    this.service.deleteTodo(id).subscribe(() => {
      this.getTodos();
    },
    error => this.errorMessage = error.message);
  }

}
