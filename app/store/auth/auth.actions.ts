import { createAction, props } from '@ngrx/store';
import { CreatePassword, Credentials, User, UserToken } from '@shared/models';

//For login
export const login = createAction(
    '[Login Page] Login',
    props<{ user: Credentials }>()
);

export const loginResult = createAction(
    '[Login Page] Login Result',
    props<{ data: any }>()
);

export const loginFailure = createAction(
    '[Login Page] Login Failure',
    props<{ loginError: string }>()
);

export const logout = createAction(
    '[Login Page] Logout',
    props<{ data: any }>()
);

export const resetLoginRequest = createAction(
    '[Login Page] Reset Login Request',
    props<{ option?: boolean }>()
);

export const setIsLogged = createAction(
    '[Login Page] Set is logged',
    props<{ isLogged: boolean }>()
);

// For request accountFor request Account
export const requestAccount = createAction(
    '[Request Account Page] Request account',
    props<{ user: Credentials, userDateTime: any }>()
);

export const requestAccountResult = createAction(
    '[Request Account Page] Request account result',
    props<{ data: any }>()
);
export const expireTimeCompletePassword = createAction(
    '[Complete Password Page] Expire time complete password page',
    props<{ error: boolean }>()
);

export const requestAccountFailure = createAction(
    '[Request Account Page] Request account Failure',
    props<{ requestAccountError: string }>()
);

// For request change password
export const requestChangePassword = createAction(
    '[Change Password Page] Request Change Password',
    props<{ email: string, userDateTime: any, ILSSAdmin?: boolean }>()
);

export const requestChangePasswordResult = createAction(
    '[Change Password Page] Request Change Password Result',
    props<{ data: any }>()
);

export const resetRequestChangePassword = createAction(
    '[Change Password Page] Reset Request Change Password'
);

export const requestChangePasswordFailure = createAction(
    '[Change Password Page] Request Change Password Failure',
    props<{ error: string }>()
);
// For change password
export const changePassword = createAction(
    '[Change Password Page] Change Password',
    props<{ data: any }>()
);

export const changePasswordResult = createAction(
    '[Change Password Page] Change Password Result',
    props<{ data: any }>()
);
export const changePasswordFailure = createAction(
    '[Change Password Page] Change Password Failure',
    props<{ error: string }>()
);
export const expiredPasswordFailure = createAction(
    '[Change Password Page] Expired Password Failure',
    props<{ error: string }>()
);

//For save password
export const completePassword = createAction(
    '[Complete Password Page] Complete Password',
    props<{ data: CreatePassword }>()
);

export const completePasswordResult = createAction(
    '[Complete Password Page] Complete Password Result',
    props<{ data: any }>()
);

export const completePasswordFailure = createAction(
    '[Complete Password Page] Complete Password Failure',
    props<{ completePasswordError: string }>()
);
export const resetCompletePassword = createAction(
    '[Complete Password Page] Reset Complete Password Request'
);
