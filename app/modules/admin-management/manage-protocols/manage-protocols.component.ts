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

interface Protocol {
    protocolId: string;
    studyCode: string;
    sponsor: string;
    studyType: string;
    status: 'ACTIVE' | 'CLOSED';
    overwriteStatus: boolean;
    overwriteValue: 'OPEN' | 'CLOSED';
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

@Component({
    selector: 'app-manage-protocols',
    templateUrl: './manage-protocols. component.html',
    styleUrls: ['./manage-protocols. component.scss']
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

    protocolDetail !: any;
    totalActivatedProtocols = 0;

    // Filter Options
    userRoleOptions: SelectOption[] = [
        { text: 'Sponsor Contact', value: 'Sponsor Contact' },
        { text: 'CRO Contact', value: 'CRO Contact' },
        { text: 'Medical Monitor', value: 'Medical Monitor' },
        { text: 'CRA', value: 'CRA' },
        { text: 'External User - Other', value: 'External User - Other' },
        { text: 'Internal User - Other', value: 'Internal User - Other' },
        { text: 'Internal User - Other 2', value: 'Internal User - Other 2' },
        { text: 'Reporting Admin', value: 'Reporting Admin' }
    ]
    regionOptions: SelectOption[] = [];

    countryOptions: SelectOption[]
        = [];

    siteOptions: SelectOption[] = [];

    userStatusOptions: SelectOption[] = [
        { value: 'Active', text: 'Active' },
        { value: 'Inactive', text: 'Inactive' }
    ]
    // Dropdown state
    showAddUserDropdown = false;
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
    showRegistrationEmailModal = false;
    showSendEmailConfirmModal = false;
    showResendEmailConfirmModal = false;

    showProtocolList = true;

    protocols: Protocol[] = [];

    selectedProtocol: Protocol | null = null;
    expandedProtocols: Set<string> = new Set();

    associatedUsers: AssociatedUser[] = [];

    selectAll = false;
    selectedUsers: Set<number> = new Set();

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
        this.showRegistrationEmailModal = false;
        this.closeMoreActionDropdown();
    }

    onMoreActionDropdownItemClick(item: DropdownActionItem): void {
        this.moreActionDropdownItems = this.moreActionDropdownItems.map(i => ({
            ...i,
            selected: i.value === item.value
        }));

        if (item.value === 'send') {
            this.showSendEmailConfirmModal = true;
        } else if (item.value === 'resend') {
            this.showResendEmailConfirmModal = true;
        } else if (item.value === 'report') {
            // TODO: Implement manage report permissions
            this.closeMoreActionDropdown();
        } else if (item.value === 'storage') {
            // TODO: Implement manage storage service blinding
            this.closeMoreActionDropdown();
        }
    }

    onSendEmailConfirm(): void {
        // TODO: Implement send email API call
        const protocolId = this.selectedProtocol?.protocolId || '';
        console.log('Sending email to protocol:', protocolId);
        
        // Show success message
        this.store.dispatch(DialogActions.showSnackBar({
            message: `Email has been sent successfully to all the users in ${protocolId}.`,
            status: 'success'
        }));
        
        this.showSendEmailConfirmModal = false;
        this.closeMoreActionDropdown();
    }

    onSendEmailCancel(): void {
        this.showSendEmailConfirmModal = false;
        this.closeMoreActionDropdown();
    }

    onResendEmailConfirm(): void {
        // TODO: Implement resend email API call
        const protocolId = this.selectedProtocol?.protocolId || '';
        console.log('Resending email to protocol:', protocolId);
        
        // Show success message
        this.store.dispatch(DialogActions.showSnackBar({
            message: `Email has been re-sent successfully to all the users in ${protocolId}.`,
            status: 'success'
        }));
        
        this.showResendEmailConfirmModal = false;
        this.closeMoreActionDropdown();
    }

    onResendEmailCancel(): void {
        this.showResendEmailConfirmModal = false;
        this.closeMoreActionDropdown();
    }
}