import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SelectionOption } from '@app/shared/components/multi-select-options/multi-select-options. component';
import { AllCheckboxState, CheckboxEvent, EditableRowUpdate, SortEvent, TableColumn } from '@app/shared/components/reusable-table/reusable-table.component';
import { AdminManagementService, GetActivatedProtocolParams } from '@app/shared/services';
import { DialogActions } from '@app/store/dialog';
import { Store } from '@ngrx/store';
import { debounceTime, distinctUntilChanged, firstValueFrom, Subject, takeUntil } from 'rxjs';
import { getIsDesktop, getSkeletonLoading } from 'src/app/store/dialog/dialog.selectors';
import { AddProfileModalData } from './manage-profiles-modal/manage-profiles-modal.component';
import { AlertType } from '@app/shared/components/alert/alert.component';

type TabValue = 'blideOrHideProfileSettings' | 'excludedUsers';

interface Tab {
    label: string;
    value: TabValue;
}

interface Profile {
    profileId ?: string,
    studyTestId: string,
    testId: string[],
    profileName: string,
    cohortId: string[],
    visitId: string[],
    blindOrHide ?: string,
    protocolId ?: string,
    isDefault ?: boolean
}

interface Protocol {
    protocolId: string,
    studyCode: string,
    studyType?: string,
    status?: 'ACTIVE' | 'CLOSED' | 'OPEN',
    sponsor?: string,
    overwriteStatus?: false
}

interface AddProfileAlertContent {
    alertType: AlertType,
    title: string;
    subtitle: string;
    showIcon: boolean
}
@Component({
    selector: 'app-manage-profiles',
    templateUrl: './manage-profiles.component.html',
    styleUrls: ['./manage-profiles.component.scss']
})
export class ManageProfilesComponent implements OnInit, OnDestroy {
    isDesktop: boolean = false;
    isLoading: boolean = false;
    private destroy$ = new Subject<void>();

    // Main data
    protocols: Protocol[] = [];
    selectedProtocol: Protocol | null = null;

    profiles: Profile[] = []
    selectedProfile: Profile | null = null
    selectedProfileCheckbox = new Set<Profile>();

    // Profiles Virtual Scroll
    totalProfiles: number = 0;
    profileOptions: any = [];
    isLoadingMoreProfile = false;
    hasMoreProfiles = false;
    profilesLazyLoadingParam: GetReportProfilesByProtocolParam = {
        page: 1,
        pageSize: 40,
        protocolId: null,
        searchValue: null
    }

    // Add Profile Modal State
    showProtocolRequiredModal = false
    showAddProfileModal = false
    isAddingProfile = false

    showRemoveProfileModal = false;
    removeProfileLoading = false;
    showRemoveBlindHideModal = false;
    removeRemoveBlindHideLoading = false;

    // Add Profile Alert State
    isAlertShown = false;
    showRemoveProfileAlert = false;
    displayAlert: AddProfileAlertContent = {
        alertType: 'success',
        title: '',
        subtitle: '',
        showIcon: true
    };

    timeOutSendingEmailAlert !: any

    // Search Protocol Virtual Scroll
    protocolOptions: SelectionOption[] = [];
    isLoadingProtocols = false;
    totalProtocols = 0;
    hasMoreProtocols = true;

    profileStatusOptions: any[] = [
    { value: 'Blind', text: 'Blind' },
    { value: 'Hide', text: 'Hide' }
    ];
    testOptions: any[] = [
    ];
    cohortOptions: any[] = [
    ];
    visitOptions: any[] = [
    ];
    testOptionsByProfile: any[] = [
    ];
    cohortOptionsByProfile: any[] = [
    ];
    visitOptionsByProfile: any[] = [
    ];

    sortField = 'Tests';
    sortType = 2;
    profileDataTable: any = [];
    page = 1;
    pageSize = 20;
    totalUsers = 10;


    currentActivatedProtocolQueryParams: GetActivatedProtocolParams = {
        page: 1,
        pageSize: 40,
        protocolId: null,
        searchFields: ['studyCode'],
        searchValue: null,
    }

    // Tabs
    selectedTab: TabValue = 'blideOrHideProfileSettings';
    tabs: Tab[] = [
        { label: 'Blide/Hide Profile Settings', value: 'blideOrHideProfileSettings' },
        { label: 'Excluded Users', value: 'excludedUsers' }
    ]

    displayAlertEditProfileSuccessfull = false;
    displayAlertEditProfileSuccessfulTimeOut: any = null;

    // Forms
    searchForm: FormGroup;
    filterForm !: FormGroup;
    searchProtocolForm !: FormGroup;
    searchText: string = '';

    exceptedUserSelection = new Set<string>();
    allUserSelectedState: AllCheckboxState = 'all-unchecked'

    // Table Columns Configuration
    tableColumns: TableColumn[] = [
        { title: 'Tests', key: 'tests', sortable: true, class: 'text-left', editable: true, multiSelect: true, allOptionsText: 'All Tests' },
        { title: 'Cohort', key: 'cohortName', sortable: true, class: 'text-left', editable: true, multiSelect: false },
        { title: 'Visits', key: 'visits', sortable: true, class: 'text-left', editable: true, multiSelect: true, allOptionsText: 'All Visits' },
        { title: 'Blind/Hide', key: 'blindOrHide', sortable: true, class: 'text-left', editable: true, multiSelect: false },
        { title: 'Action', key: 'action', sortable: false, class: 'text-center col-sticky-right noHover', isAction: true }
    ]

    

    editOptions: Record<string, SelectionOption[]> = {
        testId: [
            { id: 'All Tests', text: 'All Tests' },
            { id: 'Test 01', text: 'Test 01' },
            { id: 'Test 02', text: 'Test 02' },
            { id: '0101 - Haemoglobin', text: '0101 - Haemoglobin' },
            { id: '0102 - Haematocrit', text: '0102 - Haematocrit' },
            { id: 'Admin test 04', text: 'Admin test 04' }
        ],
        cohortId: [
            { id: 'Cohort 1', text: 'Cohort 1' },
            { id: 'Cohort 2', text: 'Cohort 2' },
            { id: 'Cohort 5', text: 'Cohort 5' },
            { id: 'Cohort 6', text: 'Cohort 6' },
            { id: 'Cohort 8', text: 'Cohort 8' }
        ],
        visitId: [
            { id: 'All Visits', text: 'All Visits' },
            { id: 'Week 20', text: 'Week 20' },
            { id: 'Week 21', text: 'Week 21' },
            { id: 'Week 22', text: 'Week 22' },
            { id: 'Week 29', text: 'Week 29' }
        ],
        blideOrHide: [
            { id: 'Blind', text: 'Blind' },
            { id: 'Hide', text: 'Hide' }
        ]
    }

    dirtyProfiles: Map<number, Profile> = new Map();

    //#region 1492 blind and hidden error variables
    hiddenBlindErrorMessage = '';
    displayAlertHiddenBlindError = false;
    displayAlertHiddenBlindErrorTimeOut: any = null;

    //#endregion

    @ViewChild(CdkVirtualScrollViewport) viewport !: CdkVirtualScrollViewport;
    @ViewChild('table', { static: false }) tableComponent !: ReusableTableComponent;
    addNewProfile = false;

    constructor(
        private store: Store,
        private fb: FormBuilder,
        private adminManagementService: AdminManagementService,
        private debounceService: DebounceService
    ) {
        this.searchForm = this.fb.group({
            searchText: ['']
        })

        this.searchProtocolForm = this.fb.group({
            searchProtocol: ['']
        })
        this.searchProfileForm = this.fb.group({
            searchProfile: ['']
        })

        this.initializeFilterForm();
    }

    private initializeFilterForm(): void {
        this.filterForm = this.fb.group({
            testId: [''],
            cohortId: [''],
            visitId: [''],
            blideOrHide: [''],
        });
    }

    ngOnInit(): void {
        this.store.select(getIsDesktop).pipe(takeUntil(this.destroy$)).subscribe((isDesktop: boolean) => {
            this.isDesktop = isDesktop;
        });

        this.store.select(getSkeletonLoading).pipe(takeUntil(this.destroy$)).subscribe((value: any) => {
            this.isLoading = value;
        });

        this.searchProfileForm.valueChanges.pipe(
            debounceTime(300),
            distinctUntilChanged(),
        ).subscribe(value => this.searchProfile(value.searchProfile));

        this.loadInitialProtocols();
    }

    ngAfterViewInit() {
        if (!this.viewport) return;
        this.viewport.elementScrolled()
        .pipe(
        debounceTime(300),
        takeUntil(this.destroy$),
        )
        .subscribe( () => {
        const distanceToBottom = this. viewport.measureScroll0ffset('bottom');

        if (!this.isLoadingMoreProfile && distanceToBottom < 100 && this.profiles.length < this.totalProfiles) {
        this.profilesLazyLoadingParam.page += 1;
        this.getReportProfilesByProtocol();
        }
        });
    }
    ngOnDestroy(): void {
        this.displayAlertEditProfileSuccessfull = false;
        this.dirtyProfiles.clear();
        this.destroy$.next();
        this.destroy$.complete();
    }
    private setLoading(loading: boolean) {
        this.store.dispatch(DialogActions.setDisplayDialogLoading({ loading }));
    }
    private setSkeletonLoading(loading: boolean) {
        this.store.dispatch(DialogActions.setSkeletonLoading({ loading }));
    }

    onInputSearch() {
        const searchFunction = () => {
        // this. searchValue = this.searchForm.get('searchText') ?. value;
        this.page = 1;
        this.getDetailProfile();
        };
        this.debounceService.debounce(searchFunction, 600)
    }
    //#region Tab Selection Logic
    onSelectTab(selectedTab: TabValue): void {
        if (this.selectedTab === selectedTab) return;
        this.selectedTab = selectedTab;
    }

    onSelectTest(data: any) {
    console.log('selected: ', data);
    this.selectedTestId = data;
    }
    onSelectCohort(data: any) {
    console.log('selected: ', data);
    this.selectedCohortId = data;
    }
    onSelectVisit(data: any) {
    console.log( 'selected: ', data);
    this.selectedVisitId = data;
    }
    //#endregion

    //#region Table User Checkbox Logic

    get isAllUserSelected(): boolean {
        return this.allUserSelectedState === 'all-checked';
    }
    get isAnyUserSelected(): boolean {
        return this.allUserSelectedState !== 'all-unchecked';
    }
    private clearExceptedUserSection() {
        this.exceptedUserSelection.clear();
    }

    onProfileUpdated(event: EditableRowUpdate): void {
        //TODO: Call API to update the profile, then show success alert

        this.displayAlertEditProfileSuccessfulTimeOut = setTimeout(() => {
            if(this.displayAlertEditProfileSuccessfull){
                this.displayAlertEditProfileSuccessfull = false;
            }
        }, 8000)
    }

    onEditCanceled(): void {
    }
    
    getKeyByIndex(index: number): string {
        return ''
    }

    private applySort(column: string, direction: 'asc' | 'desc' | 'none'): void {
        if (direction === 'none') {
            return;

            // this.sortField = column;
            // this. sortType = direction === 'asc' ? 2 : 1;
            // this.getDetailActivatedProtocol();

        }
    }
    onTableSort(event: SortEvent): void {
        this.applySort(event.column, event.direction);
    }

    onEditProfile(data: any) {
    console.log('edit profile', data);

    }

    onActionPage(action: number): void {
    if (action === 1) {
    this.page++;
    } else {
    this.page --;
    }
    this.getDetailProfile();
    }

    updateAllUserSelectedState() {
    if (this.allUserSelectedState === 'all-checked' || this.allUserSelectedState === 'some-unchecked') {
    this.allUserSelectedState = this.exceptedUserSelection.size === 0 ? 'all-checked' : 'some-unchecked'
    } else {
    this.allUserSelectedState = this.exceptedUserSelection.size === 0 ? 'all-unchecked' : 'some-checked'
    }
    }
    isUserSelected(index: number): boolean {
    const key = this.getKeyByIndex(index);
    const iskeyExisted = this.exceptedUserSelection.has(key);
    return this.allUserSelectedState === 'all-checked' || this.allUserSelectedState === 'some-unchecked' ? !isKeyExisted : isKeyExisted;
    } 

    toggleUserSelection(index: number): void {
        const key = this.getKeyByIndex(index);
        if (this.exceptedUserSelection.has(key)) {
            this.exceptedUserSelection.delete(key);
        } else {
            this.exceptedUserSelection.add(key);
        }
    }
    toggleSelectAll() {
        this.allUserSelectedState = this.isAllUserSelected ? 'all-unchecked' : 'all-checked';
        this.clearExceptedUserSection();
    }

    selectedReportUserIds: any = [];
    selectedAllReportUser = false;

    onSelectedItems(data: any) {
        this.selectedReportUserIds = data
    }

    onSelectedAll(data: any) {
        this.selectedAllReportUser = data;
    }

    // Handle checkbox event of user table on Desktop view
    onTableCheckboxChange(e: CheckboxEvent) {
        this.allUserSelectedState = e.allCheckboxState;
        this.exceptedUserSelection = new Set(e.exceptionKeyList ?? []);
    }
    //#endregion

    selectedTestId: any[] = [];
    selectedCohortId: any[] = [];
    selectedVisitId: any[] = [];

    //#region Table Action Logic
    resetFilters() {
        this.filterForm.get('testId')?.patchValue('');
        this.filterForm.get('cohortId')?.patchValue('');
        this.filterForm.get('visitId')?.patchValue('');
        this.filterForm.get('blideOrHide')?.patchValue('');
        this.selectedTestId = [];
        this.selectedCohortId = [];
        this.selectedVisitId = [];
    }
    clearFilters() {
        this.page = 1;
        this.resetFilters();
        this.getDetailProfile();
    }

    applyFilters() {

    isResetValue(form: any, field: string) {
        return form.get(field)?.value === null || form.get(field)?.value === '';
    }
    //#endregion

    //#region Protocol Lazy Loading Logic

    loadInitialProtocols(): void {
        this.getActivatedProtocols();
    }
    onLoadMoreProtocols(): void {
        if (this.isLoadingProtocols || !this.hasMoreProtocols) return;

        this.currentActivatedProtocolQueryParams = {
            ... this.currentActivatedProtocolQueryParams,
            page: this.currentActivatedProtocolQueryParams.page + 1
        }
        this.getActivatedProtocols();
    }
    onProtocolChange(selectedProtocol: SelectionOption): void {
        this.selectedProtocol = { protocolId: selectedProtocol.id, studyCode: selectedProtocol.text };
        this.getDetailSelectedProtocol();

    }

    onProtocolSearch(searchText: string): void {
        this.currentActivatedProtocolQueryParams = {
            ... this.currentActivatedProtocolQueryParams,
            page: 1,
            searchValue: searchText
        }
        this.protocolOptions = [];
        this.getActivatedProtocols();
    }
    //#endregion

    //#region Handle API Calls
    async getActivatedProtocols() {
        try {
            this.isLoadingProtocols = true;
            this.setSkeletonLoading(true);

            const response = await firstValueFrom(
                this.adminManagementService.getActivatedProtocols(this.currentActivatedProtocolQueryParams).pipe(
                    debounceTime(300),
                    distinctUntilChanged()
                ));
            this.protocols = this.protocols.length > 0 ? [... this.protocols, ...response.items] : response.items ?? [];
            this.totalProtocols = response.totalCount;
            this.protocolOptions = this.protocols.map(p => ({ id: p.protocolId, text: p.studyCode }));
        }
        catch (error) {
            this.protocols = [];
        } finally {
            this.isLoadingProtocols = false;
            this.setSkeletonLoading(false);
        }
    }
    async getDetailSelectedProtocol() {
        if (!this.selectedProtocol) return;
        try {
            this.setLoading(true);
            const queryParams = {
                searchFields: [null],
                searchValue: null,
                pageNumber: 1,
                pageSize: 10
            }
            const response = await firstValueFrom(this.adminManagementService.getDetailActivatedProtocol(this.selectedProtocol.protocolId, queryParams));
            this.selectedProtocol = {
                ... this.selectedProtocol,
                studyType: response.protocol.studyType,
                status: response.protocol.status,
                sponsor: response.protocol.sponsor,
                overwriteStatus: response.protocol.overwriteStatus
            }
        }
        catch (error) {
            this.selectedProtocol = null;
        } finally {
            this.setLoading(false);
        }
    }
}
    //#endregion