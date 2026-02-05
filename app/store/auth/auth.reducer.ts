import { createReducer, on } from '@ngrx/store';
import * as AuthActions from '@store/auth/auth.actions';
import { initialState } from './auth.state'
export const AuthReducer = createReducer(
    initialState,
    on(AuthActions.login, (state) => ({
        ...state,
        loginSuccessful: false,
        loginError: ''
    })),

    on(AuthActions.loginResult, (state, { data }) => {
        if (data.success && data.data) {
            return {
                ...state, loginSuccessful: data.success || true, loginError: '', user: null, token: '', refreshToken: ''
            };
        }
        return {
            ...state, loginSuccessful: data.success, loginError: data.Messages?.Message || ''
        };
    }),
    on(AuthActions.loginFailure, (state, { loginError }) => ({ ...state, loginSuccessful: false, loginError: 'Server error' })),

    on(AuthActions.refreshToken, (state) => {
        return { ...state, refreshTokenLoading: true };
    }),
    on(AuthActions.refreshTokenResult, (state, { data }) => {
        if (data.success && data.data.ExpirationTime) {
            const user = {
                ...state.user, expirationTime: data.data.ExpirationTime
            }
            return { ...state, user: user, refreshTokenLoading: false }
        }
        return {
            ...state, refreshTokenError: data.Messages?.Message || ''
        };
    }),

    on(AuthActions.refreshTokenFailure, (state, { refreshTokenError }) =>
        ({ ...state, refreshTokenError: 'Server error', refreshTokenLoading: false })),

    on(AuthActions.resetLoginRequest, (state, { option }) => {
        return { ...state, loginSuccessful: false, loginError: '' };
    }),

    on(AuthActions.resetModuleAuthState, (state) => {
        return { ...initialState, logoutLoading: state.logoutLoading }
    }),

    on(AuthActions.logoutAction, (state) => {
        return {
            ...initialState, isLogged: false, token: '', refreshToken: '', user: null, logoutLoading: state.logoutLoading
        };
    }),

    on(AuthActions.setIsLogged, (state, { isLogged }) => {
        return { ...state, isLogged: isLogged };
    }),

    on(AuthActions.requestAccount, (state) => ({
        ...state,
        requestAccountError: '',
    })),

    on(AuthActions.requestAccountResult, (state, { data }) => {
        return {
            ...state, requestAccountSuccessful: data.success, requestAccountError: data.Messages?.Message || ""
        };
    }),
    on(AuthActions.expireTimeCompletePassword, (state, { error }) => {
        return { ...state, expiredTimeCompletePasswordError: error };
    }),
    on(AuthActions.requestAccountFailure, (state, { requestAccountError }) => ({ ...state, requestAccountSuccessful: false, requestAccountError: 'Server error' })),
    on(AuthActions.resetRequestAccount, (state) => ({
        ...state, requestAccountSuccessful: false, requestAccountError: ''
    })),

    on(AuthActions.requestChangePassword, (state) => ({
        ...state,
        requestChangePasswordErrorCode: '',
    })),

    on(AuthActions.requestChangePasswordResult, (state, { data }) => {
        return {
            ...state, requestChangePasswordSuccessful: data.success, requestChangePasswordUrl: data?.data?.url || '', requestChangePasswordErrorCode: data.Messages?.Code || ''
        }
    }),
    on(AuthActions.requestChangePasswordFailure, (state, { error }) => ({
        ...state, requestChangePasswordSuccessful: false, requestChangePasswordUrl: '', requestChangePasswordSuccessful: false, requestPasswordUrl: '', requestChangePasswordErrorCode: 'Server error'
    })),
    on(AuthActions.resetRequestChangePassword, (state) => ({
        ...state, requestChangePasswordSuccessful: false, requestChangePasswordUrl: '', requestChangePasswordError: '', expiredTimeChangePasswordError: false
    })),

    on(AuthActions.changePassword, (state) => ({
        ...state,
        changePasswordErrorCode: '',
    })),

    on(AuthActions.changePasswordResult, (state, { data }) => {
        return {
            ...state, changePasswordSuccessful: data.success, changePasswordErrorCode: data.Messages?.Code || ''
        };
    }),
    on(AuthActions.changePasswordFailure, (state, { error }) => ({ ...state, changePasswordSuccessful: false, changePasswordErrorCode: 'Server error' })),

    on(AuthActions.completePassword, (state) => ({
        ...state,
        completePasswordSuccessful: false,
        completePasswordError: ''
    })),
    on(AuthActions.completePasswordResult, (state, { data }) => {
        return {
            ...state, completePasswordSuccessful: data.success, completePasswordError: ''
        };
    }),
    on(AuthActions.completePasswordFailure, (state, { completePasswordError }) => ({ ...state, completePasswordSuccessful: false, completePasswordError: 'Server error' })),
    
);  