import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';

import { HttpErrorResponse } from '@angular/common/http';
import {
  AuthenticationService,
  FlagService,
  RedirectService,
  fadeInUp400ms,
} from '@activepieces/ui/common';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { StatusCodes } from 'http-status-codes';
import { ApEdition } from '@activepieces/shared';
interface SignInForm {
  email: FormControl<string>;
  password: FormControl<string>;
}
@Component({
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss'],
  animations: [fadeInUp400ms],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInComponent {
  loginForm: FormGroup<SignInForm>;
  showInvalidEmailOrPasswordMessage = false;
  loading = false;
  authenticate$: Observable<void> | undefined;
  isCommunityEdition$: Observable<boolean>;
  constructor(
    private formBuilder: FormBuilder,
    private authenticationService: AuthenticationService,
    private flagsService: FlagService,
    private redirectService: RedirectService
  ) {
    this.isCommunityEdition$ = this.flagsService
      .getEdition()
      .pipe(map((ed) => ed === ApEdition.COMMUNITY));
    this.loginForm = this.formBuilder.group({
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      password: new FormControl<string>('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    });
  }

  signIn(): void {
    if (this.loginForm.valid && !this.loading) {
      this.loading = true;
      this.showInvalidEmailOrPasswordMessage = false;
      const request = this.loginForm.getRawValue();
      this.authenticate$ = this.authenticationService.signIn(request).pipe(
        catchError((error: HttpErrorResponse) => {
          if (
            error.status === StatusCodes.UNAUTHORIZED ||
            error.status === StatusCodes.BAD_REQUEST
          ) {
            this.showInvalidEmailOrPasswordMessage = true;
          }
          this.loading = false;
          return of(null);
        }),
        tap((response) => {
          if (response) {
            this.authenticationService.saveUser(response);
            this.redirect();
          }
        }),
        map(() => void 0)
      );
    }
  }

  redirect() {
    this.redirectService.redirect();
  }
}
