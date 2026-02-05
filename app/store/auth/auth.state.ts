import { User } from '@shared/models'
export interface State {
    user: any | User | null;
    error: null | string,
    isLogged: boolean,
    token: string | null,
    successful: boolean | null,
    requestAccountSuccessful: boolean,
    requestAccountError: string,
    expiredTimeCompletePasswordError: boolean,
    loginSuccessful: boolean,
    loginError: string;
    completePasswordSuccessful: boolean,
    completePasswordError: string;
    refreshToken: string | null;
    refreshTokenError: boolean | string | null;
    logoutLoading: boolean | null;
    refreshTokenLoading: boolean | null;
    releaseAllLocksSuccessful: boolean | null;
    requestChangePasswordSuccessful: boolean | null;
    requestChangePasswordUrl: any;
    requestChangePasswordErrorCode: string | null;
    changePasswordSuccessful: boolean | null;
    changePasswordErrorCode: string | null;
    expiredTimeChangePasswordError: boolean,
    sendContactUsSuccessful: boolean,
    sendContactUsError: string,
    sendReminderShippingSuccessful: boolean,
    sendReminderShippingError: string,
    recentUserPreference: any;
    getRecentUserPreferenceSuccessful: boolean;
    getRecentUserPreferenceLoading: boolean;
    dataUser: any,
    dataUserError: any,
    getAuthenticatedDetailLoading: boolean
    checkCurrentPassword: any;
    checkCurrentPasswordError: any;
    savePasswordChange: any;
    savePasswordChangeError: any;
    updatePrivacyData: any;
    updatePrivacyLoading: boolean;
    updatePrivacySuccess: boolean;
    updatePrivacyError: any,
    pdf: any;
    pdfError: any;
    formPdf: any;
    releaseNote: any | null;
    studyConfigCall: any | null;
    roles: any | null;
    getAdminUsersList: any | null;
    getAdminUsersListError: any | null;
    getAdminUsersListLoading: any | null;
    deleteUserSuccessful: boolean | null;
    deleteUserError: boolean | string | null;
    deleteUser: any | null;
    deleteUserLoading: any | null;
    addNewUserRoleSuccessful: boolean | null,
    addNewUserRoleError: string,
    isEmailRegistered: boolean | null,
    isEmailRegisteredError: string,
    updateUserRoleSuccessful: boolean | null,
    updateUserRoleError: string,
    registerLink: string | null;
    isLoggedOut: boolean | null;
    isFirstNavigateToConfig: any;
}
export const initialState: State = {
    error: '',
    isLogged: false,
    token: '',
    user: null,
    successful: null,

    requestAccountSuccessful: false,
    requestAccountError: '',
    expiredTimeCompletePasswordError: false,
    loginSuccessful: false,
    loginError: '',
    completePasswordSuccessful: false,
    completePasswordError: '',
    refreshToken: '',
    refreshTokenError: '',
    logoutLoading: false,
    refreshTokenLoading: false,
    releaseAllLocksSuccessful: false,
    requestChangePasswordSuccessful: false,
    requestChangePasswordUrl: '',
    requestChangePasswordErrorCode: '',
    changePasswordSuccessful: false,
    changePasswordErrorCode: '',
    expiredTimeChangePasswordError: false,
    sendContactUsSuccessful: false,
    sendContactUsError: '',
    sendReminderShippingSuccessful: false,
    sendReminderShippingError: '',
    recentUserPreference: null,
    getRecentUserPreferenceSuccessful: false,
    getRecentUserPreferenceLoading: false,
    dataUser: null,
    dataUserError: null,
    getAuthenticatedDetailLoading: false,
    checkCurrentPassword: 0,
    checkCurrentPasswordError: null,
    savePasswordChange: 0,
    savePasswordChangeError: null,
    updatePrivacyData: null,
    updatePrivacyError: null,
    updatePrivacyLoading: false,
    updatePrivacySuccess: false,
    pdf: null,
    pdfError: null,
    formPdf: null,
    studyConfigCall: null,
    roles: null,
    releaseNote: null,
    getAdminUsersList: null,
    getAdminUsersListError: null,
    getAdminUsersListLoading: null,
    deleteUserSuccessful: null,
    deleteUser: null,
    deleteUserError: null,
    deleteUserLoading: false,
    addNewUserRoleSuccessful: null,
    addNewUserRoleError: '',
    isEmailRegistered: null,
    isEmailRegisteredError: '',
    updateUserRoleSuccessful: null,
    updateUserRoleError: '',
    registerLink: null,
    isLoggedOut: null,
    isFirstNavigateToConfig: null,
};