import { Input, Component, Output, EventEmitter, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormGroup, FormControl, AbstractControl } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import * as AuthActions from '@store/auth/auth.actions'
import { completePasswordFailure, completePasswordSuccess, getLoginSuccessful, getRoles } from '@store/auth/auth.selectors';
import { FormBuilder, Validators } from '@angular/forms';
// import { FormGroupDirective } from '@angular/forms';
// import { setDisplayDialogLoading } from '@app/store/dialog/dialog.actions';
import { getDisplayDialogLoading, getDisplayTermsConditions, getIsDesktop } from '@app/store/dialog/dialog.selectors';
import { Base64Service } from '@services/base64.service';
import { InputComponent } from '@app/shared/components/input/input.component';
import { DialogActions } from '@app/store/dialog';
import { CheckAuthenticationService } from '@app/shared/services/check-authentication.service';
import { Roles } from '@/app/shared/utils';
import { AuthService } from '@app/modules/auth/services/auth.service';
@Component({
    selector: 'app-complete-password',
    templateUrl: './complete-password. component.html',
    styleUrls: ['./complete-password. component. scss']
})
export class CompletePasswordComponent {
    @ViewChild('inputPassword', { static: false })
    inputPasswordComponent !: InputComponent;
    user = {
        password1: '',
        confirmPassword: ''
    }
    showPassword = false;
    showConfirmPassword = false;
    completePasswordForm: FormGroup;
    checkValidate = false;
    isValid = false;
    form: FormGroup = new FormGroup({
        password: new FormControl(''),
        confirmPassword: new FormControl(''),
    });

    loadingApp: null | boolean = false;
    isInvalid = false;
    extractedEmail: string | null = null;
    isLinkExpired: null | boolean = false;
    token = '';
    showErrorPassword = false;
    showErrorConfirmPassword = false;
    checkPasswordError = false;
    checkPasswordSpecialCharactersError = false;
    checkConfirmPasswordError = false;
    valueInputPassword = null;
    displayTermsConditions = false;
    isDesktop: any;
    completePasswordFailure: null | boolean | string = '';
    isRegister: any = '';
    role: any = null;
    expiredTimeCompletePasswordError = false;

    private readonly destroy$ = new Subject<void>();
    constructor(private router: Router,
        private store: Store,
        private formBuilder: FormBuilder,
        private base64Service: Base64Service,
        private route: ActivatedRoute,
        private authService: AuthService,
        private checkAuthenticationService: CheckAuthenticationService) {
        this.completePasswordForm = this.formBuilder.group({
            password: new FormControl('',
                [Validators.required, this.supportedSpecialCharactersValidator, this.passwordValidator]),
            confirmPassword: new FormControl('', [Validators.required, this.passwordMatchValidator]),
            terms: [false, Validators.requiredTrue],
            privacy: [false, Validators.requiredTrue],
            training: [false, Validators.requiredTrue],
        }, { validators: this.passwordMatchValidator });

        if (this.route?.queryParams) {
            this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
                this.token = params['token'];
                this.isRegister = params['type'];
            });
        }
    }

    supportedSpecialCharactersValidator(control: AbstractControl): { [key: string]: any } | null {
        const value = control.value;
        const allowedPattern = /^[' ~! #$€£%^&*()+ -=< >?":(}|[\] ;. /a-zA-Z0-9]*$/;
        return allowedPattern.test(value) ? null : { unsupportedCharacter: true };
    }
    passwordValidator(control: FormControl): { [key: string]: boolean } | null {
        const value: string = control.value;

        if (!value) {
            return { passwordRequirements: true }; // No validation error if the field is empty
        }
        const hasUppercase = /[A-Z]/.test(value);
        const hasLowercase = /[a-z]/.test(value);
        const hasNumber = /[0-9]/.test(value);
        const hasSpecialCharacter = /[' =! @#$%^&*()_+{}\[\] :;< >, .?~ \\/-]/.test(value);

        const isValid =
            hasUppercase && hasLowercase && hasNumber && hasSpecialCharacter && value.length >= 8;
        // /[ ~! #$€£%^&*()+ -=< >?":{}\[\] :;< >, .?~ \\-]/
        return isValid ? null : { passwordRequirements: true };
    }
    passwordMatchValidator(control: FormGroup): { [key: string]: boolean } | null {
        const password = control.get('password')?.value;
        const confirmPassword = control.get('confirmPassword')?.value;

        if (!password) {
            return null; // No validation error if fields are empty
        }
        if (!confirmPassword) {
            return { passwordMismatch: true }; // No validation error if fields are empty

        }

        return password === confirmPassword ? null : { passwordMismatch: true };
    }

    hasErrorPassword() {
        return (this.isInvalid && this.completePasswordForm.get('password')?.errors?.['required']) || this.completePasswordForm.get('password')?.errors?.['passwordRequirements'];
    }
    hasErrorSpecialCharacter() {
        return this.completePasswordForm.get('password')?.errors?.['unsupportedCharacter'];
    }
    hasErrorConfirmPassword() {
        if (this.hasErrorPassword()) return;
        return (this.isInvalid && this.completePasswordForm.get('confirmPassword')?.errors?.['required']) || this.completePasswordForm.hasError('passwordMismatch');
    }
    async openUserGuide(event: Event) {
        event.preventDefault();
        event.stopPropagation();
        try {
            const response = await firstValueFrom(this.authService.getUserGuideFileForNewAccount('LabView360 User Guide.pdf', this.token))
            console.log(response)
            if (!response || response.success === false) {
                this.store.dispatch(DialogActions.setMessageSubjectLockInfo({ subjectLockInfo: { typeError: 38 } }));
                this.store.dispatch(DialogActions.setDisplaySubjectLockInfo({ displaySubjectLockInfo: true }));
                return
            }
            const url = `/user-guide?token=${this.token}`;

            window.open(url, '_blank');
        } catch (error) { }
    }
    submit() {
        if (this.isLinkExpired) {
            if (this.isRegister) {
                this.expiredTimeCompletePasswordError = true;
                return;
            }
            return;

        }

        this.isInvalid = false;
        this.checkValidate = false;
        this.isValid = false
        this.validatePassword()
        this.validateConfirmPassword()

        if (this.completePasswordForm.valid) {
            this.isValid = true;
            this.setLoading(true)
            this.store.dispatch(AuthActions.completePassword({
                data: {
                    token: this.token,
                    password: this.completePasswordForm.value.password
                }
            }));
        }
        else {
            this.isInvalid = true;
            this.checkValidate = true;
        }
    }

    displayTermsConditionsModal() {
        this.displayTermsConditions = !this.displayTermsConditions;

    }

    isILSSAdmin() {
        return this.role && this.role?.includes(Roles.ILSS_ADMIN);
    }
    isAdmin() {
        return this.role && this.role?.includes(Roles.ADMIN);
    }

    ngOnInit() {
        this.store.select(getRoles).pipe(takeUntil(this.destroy$)).subscribe(value => {
            this.role = value;
        });
        this.store.select(completePasswordSuccess).pipe(takeUntil(this.destroy$)).subscribe(value => {
            if (value) {
                this.setLoading(false);
                this.store.dispatch(AuthActions.resetCompletePassword());
                if (this.isRegister === "register") {
                    const queryParams = {
                        type: this.isRegister
                    };
                    this.router.navigate(['/complete-password-success'], { queryParams });
                    return;
                }
                this.router.navigate(['/complete-password-success']);
                return

            }
        });

        this.store.select(completePasswordFailure).pipe(takeUntil(this.destroy$)).subscribe(value => {
            if (value) {
                this.setLoading(false);
            }
            this.completePasswordFailure = value;

        })

        this.store.select(getDisplayDialogLoading).pipe(takeUntil(this.destroy$)).subscribe(value => {
            this.loadingApp = value;
        });

        this.store.select(getIsDesktop).pipe(takeUntil(this.destroy$)).subscribe(value => {
            this.isDesktop = value;
        });

        this.route.queryParams
            .subscribe(params => {
                this.isLinkExpired = this.extractEmailAndTime(this.decodeBase64(params.token));
                if (this.isLinkExpired && params.token) {
                    if (params.type === 'register') {
                        this.store.dispatch(AuthActions.expireTimeCompletePassword({ error: true }));
                    }
                    else {
                        this.store.dispatch(AuthActions.expireTimeCompletePassword({ error: true }));
                        this.router.navigate(['/request-account']);
                    }
                }
            });
    }

    validatePassword() {
        this.valueInputPassword = this.inputPasswordComponent.inputRef.nativeElement.value;
        this.showPassword = false;
        this.showErrorPassword = true
        this.checkPasswordError = this.hasErrorPassword();
        this.checkPasswordSpecialCharactersError = this.hasErrorSpecialCharacter()
    }
    validateConfirmPassword() {
        this.showConfirmPassword = false;
        this.showErrorConfirmPassword = true
        this.checkConfirmPasswordError = this.hasErrorConfirmPassword()
    }
    onEnterKeyPressedPassword() {
        this.showErrorPassword = true
    }
    onEnterKeyPressedConfirmPassword() {
        this.showErrorConfirmPassword = true
    }
    onChange() {
        this.checkValidate = false;
    }
    togglePasswordVisibility() {
        this.showPassword = !this.showPassword;
    }
    toggleConfirmPasswordVisibility() {
        this.showConfirmPassword = !this.showConfirmPassword;
    }
    navigateTo() {
        this.router.navigate(['/request-account']);
    }
    navigateToLogin() {
        this.router.navigate(['/login']);
    }
    handleCheckboxChange(checked: boolean): void {
        // Do something with the emitted value

    }

    decodeBase64(token: string) {
        // const encodedString = 'RW1haWw9c2Vla2VyNzc3NUBob3RtYW1sLmNvbSZFeHBpcmVkVG1tZT0xNjkyOTUwMjg1';
        return this.base64Service.decodeBase64(token);
    }
    checkExpiration(timestamp: number) {
        const createdDate = new Date(timestamp * 1000);
        const endDate = new Date(createdDate);
        endDate.setDate(endDate.getDate());
        endDate.setHours(23, 59, 59, 0);
        const currentTimestamp = Date.now();
        if (currentTimestamp <= endDate.getTime()) {
            return false
        }
        else {
            return true
        }
    }

    extractEmailAndTime(input: string) {
        const emailMatch = input.match(/Token=([^&]+)/);
        const expiredTimeMatch = input.match(/CreatedTime=([^&]+)/);

        if (emailMatch && emailMatch[1]) {
            this.extractedEmail = emailMatch[1];
        }
        if (expiredTimeMatch && expiredTimeMatch[1]) {
            // '1692488924'; time for test expired
            return this.checkExpiration(parseInt(expiredTimeMatch[1]));
        }
        return null;

    }

    get errorPassword() {
        if (this.showErrorPassword && this.checkPasswordError)
            return true
        if (this.valueInputPassword === '')
            return true
        return false
    }

    get errorPasswordSpecialCharacter() {
        if (this.errorPassword)
            return false
        if (this.showErrorPassword && this.checkPasswordSpecialCharactersError)
            return true
        return false
    }
    get errorConfirmPassword() {
        if (this.showErrorConfirmPassword && this.checkConfirmPasswordError)
            return true
        return false
    }
    setLoading(loading: boolean) {
        this.store.dispatch(DialogActions.setDisplayDialogLoading({ loading }))
    }
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.setLoading(false)
    }
    @Input() error !: string | null;


    @Output() submitEM = new EventEmitter();

}