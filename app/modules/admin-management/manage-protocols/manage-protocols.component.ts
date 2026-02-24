import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import { BehaviorSubject, debounceTime, delay, distinctUntilChanged, firstValueFrom, Observable, pairwise, Subject, takeUntil, throttleTime } from 'rxjs';
import { getIsDesktop, getSkeletonLoading } from 'src/app/store/dialog/dialog.selectors';
import { TableColumn, SortEvent } from '@app/shared/components/reusable-table/reusable-table.component';
import { Router } from '@angular/router';
import { DialogActions } from '@app/store/dialog';
import { AdminManagementService } from '@app/shared/services';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { DropdownActionItem } from '@app/shared/components/dropdown-action/dropdown-action.component';
import { ConfirmDocumentCLickEvent } from '@app/shared/components/alert/alert.component';
import { AlertType } from '@app/shared/components/alert/alert.component';

interface Protocol {
    protocolId: string;
    studyCode: string;
    sponsor: string;
    studyType: string;
    status: 'ACTIVE' | 'CLOSED';
    overwriteStatus: boolean;
    overwriteValue: 'OPEN' | 'CLOSED';
    id?: string
}

interface AssociatedUser {
    userEmail: string;
    firstName: string;
    lastName: string;
    userRole: string;
    region: string;
    country: string;
    site: string;
    userStatus: string;
    expanded?: boolean;
}

interface Filters {
    userEmail: string;
    firstName: string;
    lastName: string;
    userRole: string;
    region: string;
    country: string;
    site: string;
    userStatus: string;
}

interface SelectOption {
    value: string;
    text: string;
}

type SendingEmailType = 'sendEmail' | 'resendEmail' | 'sendEmailAll' | 'resendEmailAll';

interface ConfirmSendingEmailModalContent {
    title: string;
    content: string;
    emails: string[];
    submitLabel: string;
    cancelLabel: string;
    widthSubmitBtn: string;
    type: SendingEmailType;
    widthSubmitBtnLoading: string;
    isSendingEmail: boolean;
    isLoadingEmail: boolean;
    isEmailDisplay: boolean;
}

interface SendingEmailAlertContent {
    alertType: AlertType,
    title: string;
    subtitle: string;
    type: SendingEmailType
    showIcon: boolean;
}

@Component({
    selector: 'app-manage-protocols',
    templateUrl: './manage-protocols.component.html',
    styleUrls: ['./manage-protocols.component.scss']
})

export class ManageProtocolsComponent implements OnInit, OnDestroy {
    isDesktop: boolean = false;
    private destroy$ = new Subject<void>();

    sortField = 'email';
    sortType = 2;

    // Forms
    searchForm: FormGroup;
    filterForm !: FormGroup;
    searchProtocolForm !: FormGroup;
    searchText: string = '';
    searchProtocolValue: string = '';
    editUserData: any;
    reportPermissionsData: any;

    protocolDetail !: any;
    totalActivatedProtocols = 0;
    usersInSelectedProtocol: any[] = [
        { id: 'email 1', text: 'email 1', selected: false },
        { id: 'email 2', text: 'email 2', selected: false },
        { id: 'email 3', text: 'email 3', selected: false },
        { id: 'email 4', text: 'email 4', selected: false },
        { id: 'email 5', text: 'email 5', selected: false },
        { id: 'email 6', text: 'email 6', selected: false },
        { id: 'email 7', text: 'email 7', selected: false },
        { id: 'email 8', text: 'email 8', selected: false },
        { id: 'email 9', text: 'email 9', selected: false },
        { id: 'email 10', text: 'email 10', selected: false },
        { id: 'email 11', text: 'email 11', selected: false },
    ];

    // Filter Options
    userRoleOptions: SelectOption[] = [];

    regionOptions: SelectOption[] = [];

    countryOptions: SelectOption[] = [];

    siteOptions: SelectOption[] = [];

    userStatusOptions: SelectOption[] = [
        { value: 'Active', text: 'Active' },
        { value: 'Inactive', text: 'Inactive' }
    ]

    studyTypeOptions: any[] = [
        { value: 'ICOLIMS', text: 'ICOLIMS' },
        { value: 'IRIS', text: 'IRIS' }
    ]

    // Dropdown state
    showAddUserDropdown = false;
    showReportPermissionsModal = false;
    showStorageServiceBlindingModal = false;

    selectedProtocol: Protocol | null = null;
    addUserDropdownItems: DropdownActionItem[] = [
        { text: 'Add user manually', selected: false, value: 'manual', icon: true },
        { text: 'Copy from other protocol', selected: false, value: 'copy', icon: true }
    ];

    showMoreActionDropdown = false;
    moreActionDropdownItems: DropdownActionItem[] = [
        {
            text: 'Registration Email - Protocol', selected: false, value: 'email', icon: true, childrens: [
                { text: 'Send Email - Protocol', selected: false, value: 'send', icon: true },
                { text: 'Resend Email - Protocol', selected: false, value: 'resend', icon: true },
            ]
        },
        { text: 'Manage Report Permissions - Protocol', selected: false, value: 'report', icon: true },
        { text: 'Manage Storage Service Blinding', selected: false, value: 'storage', icon: true },
    ]
    // Modal state
    showAddUserModal = false;
    showEditUserModal = false;

    showSendAllEmailConfirmModal = false;
    showResendEmailConfirmModal = false;
    showCopyUsersModal = false;

    showProtocolList = true;

    protocols: Protocol[] = [];

    expandedProtocols: Set<string> = new Set();

    associatedUsers: AssociatedUser[] = [];

    selectAll = false;
    selectedUsers: Set<number> = new Set();

    // Alert state
    alerts = {
        email: {
            send: { success: false, failed: false, inBackground: false },
            resend: { success: false, failed: false, inBackground: false }
        },
        copyUser: { success: false, failed: false },
        serviceBlinding: { success: false }
    };

    // Pagination
    page = 1;
    pageSize = 20;
    totalUsers = 0;

    //Activated Protocol Pagination
    pageProtolcol = 1;
    pageSizeProtocol = 100;
    loading = false;
    hasMoreData = true;

    private _loadedPages = new Set<any>();
    private data$ = new BehaviorSubject<any[]>([]);
    isLoading: any = false;

    // Table Columns Configuration
    tableColumns: TableColumn[] = [
        { title: '', key: 'checkBox', sortable: false, class: 'text-center col-sticky-left noHover', isCheckBox: true },
        { title: 'User Email', key: 'email', sortable: true, class: 'text-left' },
        { title: 'First Name', key: 'firstName', sortable: true, class: 'text-left' },
        { title: 'Last Name', key: 'lastName', sortable: true, class: 'text-left' },
        { title: 'User Role', key: 'role', sortable: true, class: 'text-left' },
        { title: 'Region', key: 'region', sortable: true, class: 'text-left' },
        { title: 'Country', key: 'country', sortable: true, class: 'teyt-left' },
        { title: 'Site', key: 'site', sortable: true, class: 'text-left' },
        { title: 'User Status', key: 'status', sortable: true, class: 'text-left' },
        { title: 'Action', key: 'action', sortable: false, class: 'text-center col-sticky-right noHover', isAction: true }
    ]

    @ViewChild(CdkVirtualScrollViewport) viewport !: CdkVirtualScrollViewport;
    alertTimeouts = {
        email: {
            send: { success: null as any, failed: null as any, background: null as any },
            resend: { success: null as any, failed: null as any, background: null as any }
        }
    };

    constructor(
        private store: Store,
        private fb: FormBuilder,
        private router: Router,
        private adminManagementService: AdminManagementService
    ) {
        this.searchForm = this.fb.group({
            searchText: ['']
        });
        this.searchProtocolForm = this.fb.group({
            searchProtocol: ['']
        })
        this.initializeFilterForm();
    }
    private initializeFilterForm(): void {
        this.filterForm = this.fb.group({
            userEmail: [''],
            firstName: [''],
            lastName: [''],
            userRole: [''],
            region: [''],
            country: [''],
            site: [''],
            userStatus: ['']
        });
    }

    ngOnInit(): void {
        this.store
            .select(getIsDesktop)
            .pipe(takeUntil(this.destroy$))
            .subscribe((isDesktop: boolean) => {
                this.isDesktop = isDesktop;
            });
        this.store.select(getSkeletonLoading).pipe(takeUntil(this.destroy$)).subscribe((value: any) => {
            this.isLoading = value;
        })
        this.getActivatedProtocols();
    }

    ngAfterViewInit() {
        if (!this.viewport) return;
        this.viewport.elementScrolled()
            .pipe(
                debounceTime(300),
                takeUntil(this.destroy$),
            )
            .subscribe(() => {
                const currentPage = this.pageProtolcol;
                const nextPage = currentPage + 1;
                const scrollTop = this.viewport.measureScrollOffset('top');
                const distanceToBottom = this.viewport.measureScroll0ffset('bottom');
                const viewportHeight = this.viewport.getViewportSize();

                if (!this.isLoading && distanceToBottom < 300 && this.protocols.length < this.totalActivatedProtocols) {
                    this.pageProtolcol++;
                    this.getActivatedProtocols();
                }
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
    selectProtocol(protocol: Protocol | null): void {
        this.selectedProtocol = protocol;
        if (!this.isDesktop && protocol) {
            this.showProtocolList = false;
        }
        this.resetFilters();
        this.page = 1;
        this.getDetailActivatedProtocol();
        this.getFilterDropdownData();
    }
    backToProtocolList(): void {
        this.showProtocolList = true;
        this.selectedProtocol = null;

    }

    toggleProtocol(protocolId: string): void {
        if (this.expandedProtocols.has(protocolId)) {
            this.expandedProtocols.delete(protocolId);
        } else {
            this.expandedProtocols.add(protocolId);
        }
    }
    isProtocolExpanded(protocolId: string): boolean {
        return this.expandedProtocols.has(protocolId);
    }

    toggleUserExpansion(index: number): void {
        this.associatedUsers[index].expanded = !this.associatedUsers[index].expanded;
    }
    toggleSelectAll(): void {
        this.selectAll = !this.selectAll;
        if (this.selectAll) {
            this.selectedUsers = new Set(this.associatedUsers.map((_, i) => i));
        } else {
            this.selectedUsers.clear();
        }
    }
    toggleUserSelection(index: number): void {
        if (this.selectedUsers.has(index)) {
            this.selectedUsers.delete(index);
        } else {
            this.selectedUsers.add(index);
        }
        this.updateSelectAll();
    }
    isUserSelected(index: number): boolean {
        return this.selectedUsers.has(index);
    }
    private updateSelectAll(): void {
        this.selectAll = this.selectedUsers.size === this.associatedUsers.length;

    }

    toggleOverwriteStatus(protocol: Protocol): void {
        protocol.overwriteStatus = !protocol.overwriteStatus;
    }

    onActionPage(action: number): void {
        if (action === 1) {
            this.page++;
        } else {
            this.page--;
        }
        this.getDetailActivatedProtocol();

    }

    onTableSort(event: SortEvent): void {
        this.applySort(event.column, event.direction);
    }
    applyFilters(): void {
        const filters = this.filterForm.value;
        console.log('Applying filters:', filters);
        // Implement filter logic here
        this.page = 1;
        // this.parseToParam();
        this.getDetailActivatedProtocol();
    }
    resetFilters() {
        this.filterForm.get('userEmail')?.patchValue(null);
        this.filterForm.get('firstName')?.patchValue(null);
        this.filterForm.get('lastName')?.patchValue(null);
        this.filterForm.get('userRole')?.patchValue('');
        this.filterForm.get('region')?.patchValue('');
        this.filterForm.get('country')?.patchValue('');
        this.filterForm.get('site')?.patchValue('');
        this.filterForm.get('userStatus')?.patchValue('');
    }

    clearFilters() {
        this.resetFilters();
        // this.parseToParam();
        this.getDetailActivatedProtocol();
    }
    onPrepend(): void {
        // Handle prepend action if needed
    }
    private applySort(column: string, direction: 'asc' | 'desc' | 'none'): void {
        if (direction === 'none') {
            return;
        }
        this.sortField = column;
        this.sortType = direction === 'asc' ? 2 : 1;
        this.getDetailActivatedProtocol();
    }
    isResetValue(form: any, field: string) {
        return form.get(field)?.value === null || form.get(field)?.value === '';
    }
    private setLoading(loading: boolean) {
        this.store.dispatch(DialogActions.setDisplayDialogLoading({ loading }));
    }
    private setSkeletonLoading(loading: boolean) {
        this.store.dispatch(DialogActions.setSkeletonLoading({ loading }));
    }

    async getActivatedProtocols() {
        try {
            this.setSkeletonLoading(true);
            const queryParams = {
                page: this.pageProtolcol,
                pageSize: this.pageSizeProtocol,
                protocolId: null
            }
            const response = await firstValueFrom(this.adminManagementService.getActivatedProtocols(queryParams).pipe(
                debounceTime(300),
                distinctUntilChanged()
            ));
            // console.log("response", response);
            if (this.protocols.length > 0) {
                this.protocols = [... this.protocols, ...response.items]
            }
            else {
                this.protocols = response.items;
            }
            this.totalActivatedProtocols = response.totalCount;
            if (this.protocols.length > 0 && !this.selectedProtocol) {
                this.selectedProtocol = this.protocols[0];
                await this.getDetailActivatedProtocol()
                await this.getFilterDropdownData();
            }
            this.setSkeletonLoading(false);
        }
        catch (error) {
            this.protocols = [];
            this.setSkeletonLoading(false);
        }
    }

    async getFilterDropdownData() {
        try {
            this.setLoading(true);
            const queryParams = {
                // protocolId: this.selectedProtocol
                protocolId: "c5e895ef-a67e-456f-ab3e-35d139e3b5f8" // mock
            }
            const [
                countryResponse,
                regionResponse,
                siteResponse
            ] = await Promise.all([
                firstValueFrom(this.adminManagementService.getCountries(queryParams)),
                firstValueFrom(this.adminManagementService.getRegions(queryParams)),
                firstValueFrom(this.adminManagementService.getSites(queryParams))
            ])

            this.countryOptions = countryResponse.map((c: any) => ({
                value: c,
                text: c
            }));
            this.regionOptions = regionResponse.map((r: any) => ({
                value: r,
                text: r
            }));
            this.siteOptions = siteResponse.map((s: any) => ({
                value: s,
                text: s
            }));

        } catch (error) {
            this.countryOptions = [];
            this.regionOptions = [];
            this.siteOptions = [];
        } finally {
            this.setLoading(false)
        }
    }

    async getDetailActivatedProtocol() {
        try {
            this.setLoading(true);
            const queryParams = {
                email: this.filterForm.get('userEmail')?.value || null,
                firstName: this.filterForm.get('firstName')?.value || null,
                lastName: this.filterForm.get('lastName')?.value || null,
                role: this.filterForm.get('userRole')?.value || null,
                region: this.filterForm.get('region')?.value || null,
                country: this.filterForm.get('country')?.value || null,
                site: this.filterForm.get('site')?.value || null,
                status: this.filterForm.get('userStatus')?.value || null,
                searchFields: [
                    null
                ],
                searchValue: null,
                sortField: this.sortField,
                sortType: this.sortType,
                pageNumber: this.page,
                pageSize: this.pageSize
            }
            const response = await firstValueFrom(this.adminManagementService.getDetailActivatedProtocol(this.selectedProtocol?.protocolId, queryParams));
            this.protocolDetail = response.protocol;
            this.associatedUsers = response.items;
            this.totalUsers = response.filteredTotalCount;
            this.setLoading(false);
        }
        catch (error) {
            this.protocolDetail = [];
            this.associatedUsers = [];
            this.setLoading(false);
        }
    }

    toggleAddUserDropdown(event: any): void {
        event.stopPropagation()
        this.showAddUserDropdown = !this.showAddUserDropdown;
    }
    toggleMoreActionDropdown(event: any) {
        event.stopPropagation()
        this.showMoreActionDropdown = !this.showMoreActionDropdown;

    }

    closeAddUserDropdown(): void {
        this.addUserDropdownItems = this.addUserDropdownItems.map(i => ({
            ...i,
            selected: false
        }));
        this.showAddUserDropdown = false;
    }
    closeMoreActionDropdown(): void {
        this.moreActionDropdownItems = this.moreActionDropdownItems.map(i => ({
            ...i,
            selected: false
        }));
        this.showMoreActionDropdown = false;

    }

    onAddUserDropdownItemClick(item: DropdownActionItem): void {
        // Update selected state for all items
        this.addUserDropdownItems = this.addUserDropdownItems.map(i => ({
            ...i,
            selected: i.value === item.value
        }));
        if (item.value === 'manual') {
            this.showAddUserModal = true;
        } else if (item.value === 'copy') {
            // TODO
            this.closeAddUserDropdown();
        }
    }

    onAddUserModalSave(data: any): void {
        // TODO: Implement save logic
        console.log('Add user:', data);
        this.showAddUserModal = false;
        this.closeAddUserDropdown();

    }

    onAddUserModalClose(): void {
        this.showAddUserModal = false;
        this.closeAddUserDropdown();
    }
    onRegistrationModalClose(): void {
        this.closeMoreActionDropdown();
    }

    onMoreActionDropdownItemClick(item: DropdownActionItem): void {
        this.moreActionDropdownItems = this.moreActionDropdownItems.map(i => ({
            ...i,
            selected: i.value === item.value
        }));

        if (item.value === 'send') {
            this.openEmailConfirmModal('send');
        } else if (item.value === 'resend') {
            this.openEmailConfirmModal('resend');
        } else if (item.value === 'report') {
            // TODO: Implement manage report permissions
            this.closeMoreActionDropdown();
        } else if (item.value === 'storage') {
            // TODO: Implement manage storage service blinding
            this.closeMoreActionDropdown();
        }
    }

    showSendingEmailAlert = false;
    showSendingEmailBackgroundAlert = false;
    sendingEmailAlertContent: SendingEmailAlertContent = {
        alertType: 'success',
        title: '',
        subtitle: '',
        type: 'sendEmail',
        showIcon: true
    }
    showSendingEmailBackgroundTimeOut?: any;


    // Registration email confirm modal
    showRegistrationEmailConfirmModal = false;
    sendingEmailConfirmModalContent: ConfirmSendingEmailModalContent = {
        title: '',
        content: '',
        submitLabel: '',
        widthSubmitBtn: '',
        widthSubmitBtnLoading: '',
        cancelLabel: 'Cancel',
        emails: [],
        type: 'sendEmail',
        isSendingEmail: false,
        isLoadingEmail: false,
        isEmailDisplay: true
    }

    showSendingEmailAlertWithTimeOut() {
        // Clear timeout of the sending email background alert
        if (this.showSendingEmailBackgroundTimeOut) {
            clearTimeout(this.showSendingEmailBackgroundTimeOut);
            this.showSendingEmailBackgroundTimeOut = null
        }

        this.showSendingEmailAlert = true;
        setTimeout(() => {
            this.showSendingEmailAlert = false;
        }, 8000)
    }
    showSendingEmailBackgroundAlertWithTimeOut() {
        this.showSendingEmailBackgroundAlert = true;
        setTimeout(() => {
            this.showSendingEmailBackgroundAlert = false;
        }, 8000)
    }


    setTimeOutToShowSendingEmailBackgroundAlert(type: SendingEmailType) {
        this.updateSendingEmailAlertContent(type, 'success', true);
        this.showSendingEmailBackgroundTimeOut = setTimeout(() => {
            this.showRegistrationEmailConfirmModal = false;
            this.showSendAllEmailConfirmModal = false;
            this.showResendEmailConfirmModal = false;
            this.showSendingEmailBackgroundAlertWithTimeOut()
        }, 3000)
    }

    updateSendingEmailAlertContent(type: SendingEmailType, alertType: AlertType, background: boolean = false) {
        if (type == 'sendEmail') {
            this.sendingEmailAlertContent = {
                ... this.sendingEmailAlertContent,
                alertType,
                title: alertType === 'success' ? 'Success!' : 'Failed!',
                subtitle: alertType === 'success' ?
                    `Email has been sent successfully to the selected users in ${this.selectedProtocol?.studyCode}.` :
                    'The email was not sent successfully. Please try again.',
                type: 'sendEmail',
            }
            if (background) {
                this.sendingEmailAlertContent = {
                    ... this.sendingEmailAlertContent,
                    subtitle: 'Emails are being sent in the background. You will receive a success message once all emails are sent successfully.',
                }
            }
        } else if (type == 'resendEmail') {
            this.sendingEmailAlertContent = {
                ... this.sendingEmailAlertContent,
                alertType,
                title: alertType === 'success' ? 'Success!' : 'Failed!',
                subtitle: alertType === 'success' ?
                    `Email has been re-sent successfully to the selected users in ${this.selectedProtocol?.studyCode}.` :
                    'The email was not re-sent successfully. Please try again.',
                type: 'resendEmail',
            }

            if (background) {
                this.sendingEmailAlertContent = {
                    ... this.sendingEmailAlertContent,
                    subtitle: 'Emails are being re-sent in the background. You will receive a success message once all emails are sent successfully.',
                }
            }
        } else if (type == 'sendEmailAll') {
            this.sendingEmailAlertContent = {
                ... this.sendingEmailAlertContent,
                alertType,
                title: alertType === 'success' ? 'Success!' : 'Failed!',
                subtitle: alertType === 'success' ?
                    `Email has been sent successfully to all the users in ${this.selectedProtocol?.studyCode}.` :
                    'The email was not sent successfully. Please try again.',
                type: 'sendEmail',
            }
            if (background) {
                this.sendingEmailAlertContent = {
                    ... this.sendingEmailAlertContent,
                    subtitle: 'Emails are being sent in the background. You will receive a success message once all emails are sent successfully. ',
                }
            }
        } else if (type == 'resendEmailAll') {
            this.sendingEmailAlertContent = {
                ... this.sendingEmailAlertContent,
                alertType,
                title: alertType === 'success' ? 'Success!' : 'Failed!',
                subtitle: alertType === 'success' ?
                    `Email has been re-sent successfully to all the users in ${this.selectedProtocol?.studyCode}.` :
                    'The email was not sent successfully. Please try again.',
                type: 'sendEmail',
            }
            if (background) {
                this.sendingEmailAlertContent = {
                    ... this.sendingEmailAlertContent,
                    subtitle: 'Emails are being re-sent in the background. You will receive a success message once all emails are sent successfully.',
                }
            }
        }
    }

    async onSendAllEmailConfirm() {
    const sendEmailType: SendingEmailType = 'sendEmailAll';
    const protocolId = this.selectedProtocol?.protocolId;

    if (!protocolId) {
        this.updateSendingEmailAlertContent(sendEmailType, 'error');
        this.showSendAllEmailConfirmModal = false;
        this.showSendingEmailAlertWithTimeOut();
        return;
    }
    this.isLoading = true;
    this.sendingEmailConfirmModalContent = {
        ... this.sendingEmailConfirmModalContent,
        isSendingEmail: true
    };

    this.setTimeOutToShowSendingEmailBackgroundAlert(sendEmailType);

    try {
        const response = await firstValueFrom(
            this.adminManagementService.sendProtocolAccessNotification({ protocolId }))

        this.updateSendingEmailAlertContent(
            sendEmailType,
            response?.data?.success ? 'success' : 'error'
        );
    }
    catch {
        this.updateSendingEmailAlertContent(sendEmailType, 'error');
    } finally {
        this.isLoading = false;

        this.sendingEmailConfirmModalContent = {
            ...this.sendingEmailConfirmModalContent,
            isSendingEmail: false
        }
        this.showSendAllEmailConfirmModal = false;
        this.showSendingEmailAlertWithTimeOut();
    }
}

openEmailConfirmModal(type: 'send' | 'resend'): void {
    this.setEmailConfirmModal(type, true);
}

    async onEmailConfirm(type: 'send' | 'resend') {
    this.setEmailConfirmModal(type, false);
    this.closeMoreActionDropdown();
    await this.handleEmailOperation(type);
}

onEmailCancel(type: 'send' | 'resend'): void {
    this.setEmailConfirmModal(type, false);
    this.closeMoreActionDropdown();
}

    private setEmailConfirmModal(type: 'send' | 'resend', isOpen: boolean): void {
    if(type === 'send') {
    this.showSendAllEmailConfirmModal = isOpen;
} else {
    this.showResendEmailConfirmModal = isOpen;
}
    }

    private async handleEmailOperation(type: 'send' | 'resend'): Promise < void> {
    const protocolId = this.selectedProtocol?.protocolId || '';
    const studyCode = this.selectedProtocol?.studyCode || '';
    console.log(`${type === 'send' ? 'Sending' : 'Resending'} email to protocol:`, protocolId);

    this.isLoading = true;

    // Set timeout to show background message if operation takes longer than 3 seconds
    this.alertTimeouts.email[type].background = setTimeout(() => {
        this.showBackgroundEmailAlert(type);
    }, 3000);

    try {
        const response = await firstValueFrom(
            this.adminManagementService.sendProtocolAccessNotification(protocolId)
        );

        // Clear background check timeout
        if(this.alertTimeouts.email[type].background) {
    clearTimeout(this.alertTimeouts.email[type].background);
    this.alertTimeouts.email[type].background = null;
}

// Hide background message if it was shown
this.hideBackgroundEmailAlert(type);

if (response.data) {
    this.showSuccessAlert(type, studyCode);
} else {
    this.showFailureAlert(type);
}
        } catch (error) {
    console.log(error);

    // Clear background check timeout
    if (this.alertTimeouts.email[type].background) {
        clearTimeout(this.alertTimeouts.email[type].background);
        this.alertTimeouts.email[type].background = null;
    }

    // Hide background message if it was shown
    this.hideBackgroundEmailAlert(type);

    this.showFailureAlert(type);
} finally {
    this.isLoading = false;
}
    }

    private showBackgroundEmailAlert(type: 'send' | 'resend'): void {
    this.alerts.email[type].inBackground = true;
}

    private hideBackgroundEmailAlert(type: 'send' | 'resend'): void {
    this.alerts.email[type].inBackground = false;
}

    private showSuccessAlert(type: 'send' | 'resend', studyCode: string): void {
    if(this.alertTimeouts.email[type].success) {
    clearTimeout(this.alertTimeouts.email[type].success);
}

this.alerts.email[type].success = true;

this.alertTimeouts.email[type].success = setTimeout(() => {
    this.alerts.email[type].success = false;
}, 8000);
    }

    private showFailureAlert(type: 'send' | 'resend'): void {
    if(this.alertTimeouts.email[type].failed) {
    clearTimeout(this.alertTimeouts.email[type].failed);
}

this.alerts.email[type].failed = true;

this.alertTimeouts.email[type].failed = setTimeout(() => {
    this.alerts.email[type].failed = false;
}, 8000);
    }

onCloseEmailAlert(type: 'send' | 'resend', status: 'success' | 'failed' = 'success'): void {
    this.alerts.email[type][status] = false;
}
}