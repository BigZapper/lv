import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, ofType, createEffect, concatLatestFrom } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, exhaustMap, map, tap, withLatestFrom } from 'rxjs/operators';
import * as
    AuthActions from '@store/auth/auth.actions';
// import { Credentials } from '@shared/models';
import { AuthService } from '@shared/services';
import { TokenService } from '@app/shared/services/token. service';
import { CheckAuthenticationService } from '@app/shared/services/check-authentication.service';
import { Store } from '@ngrx/store';
@Injectable()
export class AuthEffects {

    constructor(
        private actions$: Actions,
        private authService: AuthService,
        private tokenService: TokenService,
        private authenticationService: CheckAuthenticationService,
        private router: Router,
        private store: Store
    ) { }

    login$ = createEffect(() =>
        this.actions$.pipe(
            ofType(AuthActions.login),
            exhaustMap(action =>
                this.authService.login(action.user).pipe(
                    map((data) => AuthActions.loginResult({ data })),
                    catchError((loginError) => of(AuthActions.loginFailure({ loginError })))
                )
            )
        )
    );

    requestAccount$ = createEffect(() =>
        this.actions$.pipe(
            ofType(AuthActions.requestAccount),
            exhaustMap(action =>
                this.authService.requestAccount(action.user, action.userDateTime).pipe(
                    map((data) => AuthActions.requestAccountResult({ data })),
                    catchError((requestAccountError) => of(AuthActions.requestAccountFailure({ requestAccountError })))
                )
            )
        )
    );
    //For request change password
    requestChangePassword$ = createEffect(() =>
        this.actions$.pipe(
            ofType(AuthActions.requestChangePassword),
            exhaustMap(action =>
                this.authService.requestChangePassword(action.email, action.userDateTime, action.ILSSAdmin).pipe(
                    map((data) => AuthActions.requestChangePasswordResult({ data })),
                    catchError((error) => of(AuthActions.requestChangePasswordFailure({ error })))
                )
            )
        )
    );

    //For change password
    changePassword$ = createEffect(() =>
        this.actions$.pipe(
            ofType(AuthActions.changePassword),
            exhaustMap(action =>
                this.authService.changePassword(action.data).pipe(
                    map((data) => AuthActions.changePasswordResult({ data })),
                    catchError((error) => of(AuthActions.changePasswordFailure({ error })))

                )
            )
        )
    );

    completePassword$ = createEffect(() =>
        this.actions$.pipe(
            ofType(AuthActions.completePassword),
            exhaustMap(action =>
                this.authService.completePassword(action.data).pipe(
                    map((data) => AuthActions.completePasswordResult({ data })),
                    catchError((completePasswordError) => of(AuthActions.completePasswordFailure({ completePasswordError })))
                )
            )
        )
    );
    //logout
    logout$ = createEffect(() =>
        this.actions$.pipe(
            ofType(AuthActions.logout),
            exhaustMap(action =>
                this.authService.logout(action.data).pipe(
                    map(() => AuthActions.logoutAction()),
                    catchError(() => of(AuthActions.logoutAction()))
                )
            )
        )
    );

    refreshToken$ = createEffect(() =>
        this.actions$.pipe(
            ofType(AuthActions.refreshToken),
            exhaustMap(action =>
                this.tokenService.refreshToken().pipe(
                    map((data) => AuthActions.refreshTokenResult({ data })),
                    catchError((refreshTokenError) => of(AuthActions.refreshTokenFailure({ refreshTokenError })))
                )
            )
        )
    );

    releaseAllLocks$ = createEffect(() =>
        this.actions$.pipe(
            ofType(AuthActions.releaseAllLocks),
            exhaustMap(action =>
                this.authService.releaseAllLocks(action.ICOLIMSUserId).pipe(
                    map((data) => AuthActions.releaseAllLocksResult({ data })),
                    catchError((releaseAllLocksError) => of(AuthActions.releaseAllLocksFailure({ releaseAllLocksError })))
                )
            )
        )
    )

    sendContactUs$ = createEffect(() =>
        this.actions$.pipe(
            ofType(AuthActions.sendContactUs),
            exhaustMap(action =>
                this.authService.sendContactUs(action.data).pipe(
                    map((data) => AuthActions.sendContactUsResult({ data })),
                    catchError((sendContactUsError) => of(AuthActions.sendContactUsFailure({ sendContactUsError })))
                )
            )
        ));

    sendReminderShipping$ = createEffect(() =>
        this.actions$.pipe(
            ofType(AuthActions.sendReminderShipping),
            exhaustMap(action =>
                this.authService.sendReminderShipping(action.data).pipe(
                    map((data) => AuthActions.sendReminderShippingResult({ data })),
                    catchError((sendReminderShippingError) =>
                        of(AuthActions.sendReminderShippingFailure({ sendReminderShippingError })))
                )

            )
        )
    );

    getRecentUserPreference$ = createEffect(() =>
        this.actions$.pipe(
            ofType(AuthActions.getRecentUserPreference),
            exhaustMap(action =>
                this.authService.getRecentUserPreference(action.userId).pipe(
                    map((data) => AuthActions.getRecentUserPreferenceResult({ data })),
                    catchError((getRecentUserPreferenceError) =>
                        of(AuthActions.getRecentUserPreferenceFailure({ getRecentUserPreferenceError })))

                )
            )
        )
    );

    getAuthenticatedDetail$ = createEffect(() =>
        this.actions$.pipe(
            ofType(AuthActions.getAuthenticatedDetail),
            exhaustMap((action) =>
                this.authService.getAuthenticatedDetail().pipe(
                    withLatestFrom(
                        this.store.select((state: any) => state?.auth?.isLogged)
                    ),
                    tap(([result, isLogged]) => {
                        this.authenticationService.setRawRoles(result?.data?.roles);
                        this.authenticationService.setDataAuthentication(result);
                    }),
                    map(([data, isLogged]) => {
                        return (AuthActions.
                            getAuthenticatedDetailResult({ data: data?.data, setIsLogged: isLogged ? isLogged : action.setIsLogged }))
                    }),
                    catchError((error) => of(AuthActions.getAuthenticatedDetailFailure({ error })))
                )
            )
        )

    );

    checkCurrentPassword$ = createEffect(() =>
        this.actions$.pipe(
            ofType(AuthActions.checkCurrentPassword),
            exhaustMap(action =>
                this.authService.checkCurrentPassword(action.data).pipe(
                    map((data) => AuthActions.checkCurrentPasswordResult({ data })),
                    catchError((error) =>
                        of(AuthActions.checkCurrentPasswordFailure({ error })))
                )
            )
        )
    );

    savePasswordChange$ = createEffect(() =>
        this.actions$.pipe(
            ofType(AuthActions.savePasswordChange),
            exhaustMap(action =>
                this.authService.changePasswordWithoutToken(action.data).pipe(
                    map((data) => AuthActions.savePasswordChangeResult({ data })),
                    catchError((error) =>
                        of(AuthActions.savePasswordChangeFailure({ error })))
                )
            )
        )
    );

    updateAgreePrivacies$ = createEffect(() =>
        this.actions$.pipe(
            ofType(AuthActions.updateAgreePrivacies),
            exhaustMap(action =>
                this.authService.updateAgreePrivacies(action.data).pipe(
                    map((data) => AuthActions.updateAgreePrivaciesResult({ data })),
                    catchError((error) =>
                        of(AuthActions.updateAgreePrivaciesFailure({ error })))
                )
            )
        )
    );
}