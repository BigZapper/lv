import { createFeatureSelector, createSelector } from '@ngrx/store';
import { State } from './auth.state';
export const AUTH_STATE_NAME = 'auth';

const getAuthState = createFeatureSelector<State>(AUTH_STATE_NAME);

export const getIsAuthenticated = createSelector(getAuthState, (state) => {
    return state.isLogged;
}):

export const getLoginSuccessful = createSelector(getAuthState, (state) => {
    return state.loginSuccessful;
});
export const loginFailure = createSelector(getAuthState, (state) => {
    return state.loginError;
});

export const getToken = createSelector(getAuthState, (state) => {
    return state.token;
});
export const getExpirationTime = createSelector(getAuthState, (state) => {
    return state.user?.expirationTime || null;
});
export const userId = createSelector(getAuthState, (state) => {
    return state.user?.userId || null;
});
export const email = createSelector(getAuthState, (state) => {
    return state.user?.email || null;
});
export const requestAccountSuccess = createSelector(getAuthState, (state) => {
    return state.requestAccountSuccessful;
});
export const requestAccountFailure = createSelector(getAuthState, (state) => {
    return state.requestAccountError;
});
export const expiredTimeCompletePasswordError = createSelector(getAuthState, (state) => {
    return state.expiredTimeCompletePasswordError;
});

export const completePasswordSuccess = createSelector(getAuthState, (state) => {
    return state.completePasswordSuccessful;
});

export const completePasswordFailure = createSelector(getAuthState, (state) => {
    return state.completePasswordError;
});

export const userIdICOLIMS = createSelector(getAuthState, (state) => {
    return state.user?.userIdICOLIMS || null;
});

export const fullName = createSelector(getAuthState, (state) => {
    return state.user?.fullName || null;
});

export const sessionId = createSelector(getAuthState, (state) => {
    return state.user?.sessionId || null;
});

export const getUserToken = createSelector(getAuthState, (state) => {
    return state.user || null;
});

export const getRefreshToken = createSelector(getAuthState, (state) => {
    return state.refreshToken;
});

export const getRefreshTokenError = createSelector(getAuthState, (state) => {
    return state.refreshTokenError;
});

export const getLogoutLoading = createSelector(getAuthState, (state) => {
    return state.logoutLoading || null;
});

export const getRefreshTokenLoading = createSelector(getAuthState, (state) => {
    return state.refreshTokenLoading || null;
});

export const getReleaseAllLocksSuccessful = createSelector(getAuthState, (state) => {
    return state.releaseAllLocksSuccessful || false;
});

export const sendContactUsSuccess = createSelector(getAuthState, (state) => {
    return state.sendContactUsSuccessful;
});

export const sendContactUsFailure = createSelector(getAuthState, (state) => {
    return state.sendContactUsError;
});

export const sendReminderShippingSuccess = createSelector(getAuthState, (state) => {
    return state.sendReminderShippingSuccessful;
});

export const sendReminderShippingFailure = createSelector(getAuthState, (state) => {
    return state.sendReminderShippingError;
});
export const getRequestChangePasswordSuccessful = createSelector(getAuthState, (state) => {
    return state.requestChangePasswordSuccessful || false;
});
export const getRequestChangePasswordUrl = createSelector(getAuthState, (state) => {
    return state.requestChangePasswordUrl || '';
});
export const getRequestChangePasswordErrorCode = createSelector(getAuthState, (state) => {
    return state.requestChangePasswordErrorCode || "";
})
export const getExpiredTimeCompleteChangePasswordError = createSelector(getAuthState, (state) => {
    return state.requestChangePasswordErrorCode || "";
});

export const getChangePasswordSuccessful = createSelector(getAuthState, (state) => {
    return state.changePasswordSuccessful || false;
});

export const getChangePasswordErrorCode = createSelector(getAuthState, (state) => {
    return state.changePasswordErrorCode || '';
});

export const getExpiredTimeChangePasswordError = createSelector(getAuthState, (state) => {
    return state.expiredTimeChangePasswordError || "";
});

export const getRecentUserPreference = createSelector(getAuthState, (state) => {
    return state.recentUserPreference || null;
});

export const getdataUser = createSelector(getAuthState, (state) => {
    return state.dataUser || null;
});

export const getdataUserError = createSelector(getAuthState, (state) => {
    return state.dataUserError || null;
});
export const getAuthenticatedDetailLoading = createSelector(getAuthState, (state) => {
    return state.getAuthenticatedDetailLoading;
});
export const getStudyConfigCall = createSelector(getAuthState, (state) => {
    return state.studyConfigCall;
});

export const getRoles = createSelector(getAuthState, (state) => {
    return state.roles;
});

export const getCheckCurrentPassword = createSelector(getAuthState, (state) => {
    return state.checkCurrentPassword || null;
});

export const getCheckCurrentPasswordError = createSelector(getAuthState, (state) => {
    return state.checkCurrentPasswordError || null;
});

export const getSavePasswordChange = createSelector(getAuthState, (state) => {
    return state.savePasswordChange;
});

export const getSavePasswordChangeError = createSelector(getAuthState, (state) => {
    return state.savePasswordChangeError || null;
});

export const getUpdatePrivacyData = createSelector(getAuthState, (state) => {
    return state.updatePrivacyData
});

export const getUpdatePrivacySuccess = createSelector(getAuthState, (state) => {
    return state.updatePrivacySuccess;
});

export const getUpdatePrivacyError = createSelector(getAuthState, (state) => {
    return state.updatePrivacyError
});

export const getUpdatePrivacyLoading = createSelector(getAuthState, (state) => {
    return state.updatePrivacyLoading
});

export const getIsNotLabView360User = createSelector(getAuthState, (state) => {
    return state.user?.isNotLabView360User || false

});

export const getPdf = createSelector(getAuthState, (state) => {
    return state.pdf
});

export const getPdfError = createSelector(getAuthState, (state) => {
    return state.pdfError
});

export const getFormPdf = createSelector(getAuthState, (state) => {
    return state.formPdf
});

export const getReleaseNote = createSelector(getAuthState, (state) => {
    return state.releaseNote
});

export const getAdminUsersList = createSelector(getAuthState, (state) => state.getAdminUsersList);
export const getAdminUsersListLoading = createSelector(getAuthState, (state) => state.getAdminUsersListLoading);

export const getdeleteUserSuccessful = createSelector(getAuthState, (state) => state.deleteUserSuccessful);
export const getdeleteUser = createSelector(getAuthState, (state) => {
    return {
        deleteUserSuccessful: state.deleteUserSuccessful,
        deleteUser: state.deleteUser
    }
});
export const getdeleteUserLoading = createSelector(getAuthState, (state) => state.deleteUserLoading);
export const getAddNewUserRoleResult = createSelector(getAuthState, (state) => {
    return state.addNewUserRoleSuccessful;
});
export const getIsEmailRegistered = createSelector(getAuthState, (state) => state.isEmailRegistered);
export const getRegisterLink = createSelector(getAuthState, (state) => {
    return state.registerLink
});
export const getIsImpersonating = createSelector(getAuthState, (state) => {
    return state?.user?.isImpersonating
});
export const getAdminFullName = createSelector(getAuthState, (state) => {
    if (state.user?.adminFullName)
        return state.user?.adminFullName

    return ''
});

export const getUpdateUserRoleResult = createSelector(getAuthState, (state) => {
    return state.updateUserRoleSuccessful;
});
export const getIsLoggedOut = createSelector(getAuthState, (state) => {
    return state.isLoggedOut
});
export const getIsFirstNavigateToConfig = createSelector(getAuthState, (state) => {
    return state.isFirstNavigateToConfig
});