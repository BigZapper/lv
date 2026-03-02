import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SelectionOption } from '@app/shared/components/multi-select-options/multi-select-options. component';
import { AllCheckboxState, CheckboxEvent, EditableRowUpdate, ReusableTableComponent, SortEvent, TableColumn } from '@app/shared/components/reusable-table/reusable-table.component';
import { AdminManagementService, GetActivatedProtocolParams, DebounceService, GetReportProfilesByProtocolParam } from '@app/shared/services';
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
    profileId?: string,
    studyTestId: string,
    testId: string[],
    profileName: string,
    cohortId: string[],
    visitId: string[],
    blindOrHide?: string,
    protocolId?: string,
    isDefault?: boolean
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
    selectedProfileByCheckbox = new Set<Profile>();

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

    // Store studyId from filter response
    studyId: string | null = null;

    sortField = 'Tests';
    sortType = 2;
    profileDataTable: any = [];
    profileDataTableRaw: Map<number, any> = new Map(); // Store original data for edit operations
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
    searchProfileForm !: FormGroup;
    searchProtocolForm !: FormGroup;
    searchText: string = '';

    exceptedUserSelection = new Set<string>();
    allUserSelectedState: AllCheckboxState = 'all-unchecked'

    // Table Columns Configuration
    tableColumns: TableColumn[] = [
        { title: "", key: 'checkbox', sortable: false, class: 'text-left nohover', isCheckBox: true, widthColumn: '57px' },
        { title: "Tests", key: 'testsDisplay', sortable: true, sortField: "Tests", multiSelect: true, allOptionsText: "All Tests", class: 'text-left', widthColumn: 'calc((100% - 557px)/2)', editable: true },
        { title: "Cohort", key: "cohortName", sortable: true, multiSelect: false, allOptionsText: "All Cohorts", sortField: 'CohortName', class: "text-left", widthColumn: "228px", editable: true },
        { title: "Visits", key: "visitsDisplay", sortable: true, sortField: "Visits", multiSelect: true, allOptionsText: "All Visits", class: "text-left", widthColumn: "calc((100% - 557px)/2)", editable: true },
        { title: 'Blind/Hide', key: 'blindOrHide', sortable: true, multiSelect: false, sortField: 'BlindOrHide', class: 'text-left', widthColumn: '200px', editable: true },
        { title: 'Action', key: 'actionProfile', sortable: false, class: 'text-center nohover', isAction: true, widthColumn: '88px' }
    ];

    // Map display column keys to actual data keys for edit mode
    editKeyMap: Record<string, string> = {
        'testsDisplay': 'testsValues',
        'visitsDisplay': 'visitsValues',
        'cohortName': 'cohortValue'
    };

    dirtyProfiles: Map<number, Profile> = new Map();

    //#region 1492 blind and hidden error variables
    hiddenBlindErrorMessage = '';
    displayAlertHiddenBlindError = false;
    displayAlertHiddenBlindErrorTimeOut: any = null;

    //#endregion

    //#region Cohort-Test Validation Error Variables
    testCohortValidationError = '';
    displayTestCohortValidationError = false;
    testCohortValidationErrorTimeOut: any = null;
    cohortTestsMapping: Map<string, string[]> = new Map(); // Maps cohortId to array of testIds
    //#endregion

    // Cache for editOptions to prevent recreating on every change detection cycle
    private _editOptionsCache: Record<string, SelectionOption[]> | null = null;
    private _editOptionsCacheHash: string = '';

    /**
     * Dynamic getter for editOptions from testOptions, cohortOptions, visitOptions
     * Uses caching to prevent unnecessary array recreations that trigger change detection
     */
    get editOptions(): Record<string, SelectionOption[]> {
        const currentHash = this.getEditOptionsHash();
        if (this._editOptionsCache === null || this._editOptionsCacheHash !== currentHash) {
            this._editOptionsCacheHash = currentHash;
            this._editOptionsCache = {
                testsDisplay: this.testOptions.map(t => ({ id: t.id, text: t.text })),
                cohortName: this.cohortOptions.map(c => ({ id: c.id, text: c.text })),
                visitsDisplay: this.visitOptions.map(v => ({ id: v.id, text: v.text })),
                blindOrHide: this.profileStatusOptions.map(p => ({ id: p.value, text: p.text }))
            };
        }
        return this._editOptionsCache;
    }

    /**
     * Generate hash of source data to detect if editOptions need rebuilding
     */
    private getEditOptionsHash(): string {
        const testIds = this.testOptions.map(t => t.id).join(',');
        const cohortIds = this.cohortOptions.map(c => c.id).join(',');
        const visitIds = this.visitOptions.map(v => v.id).join(',');
        const statusValues = this.profileStatusOptions.map(p => p.value).join(',');
        return `${testIds}|${cohortIds}|${visitIds}|${statusValues}`;
    }

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
            .subscribe(() => {
                const distanceToBottom = this.viewport.measureScroll0ffset('bottom');

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
        console.log('selected: ', data);
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

    async onProfileUpdated(event: EditableRowUpdate): Promise<void> {
        const updatedRow = event.row;
        const index = event.index;

        // Convert back from display values to original structure
        this.restoreProfileDataStructure(updatedRow, index);

        try {
            this.setLoading(true);
            const reportProfileSettingId = updatedRow.profileId;
            const updateData = {
                profileId: reportProfileSettingId,
                testIds: updatedRow.tests?.map((t: any) => t.studyTestId) || [],
                cohortId: updatedRow.cohortId || '',
                visitIds: updatedRow.visits?.map((v: any) => v.visitId) || [],
                blindOrHide: updatedRow.blindOrHide
            };

            const response = await firstValueFrom(
                this.adminManagementService.updateReportProfileSetting(reportProfileSettingId, updateData)
            );

            if (response?.success) {
                this.displayAlertEditProfileSuccessfull = true;
                this.showAlert('success', `Profile settings updated successfully.`);
                this.toggleAlertWithTimeout("isAlertShown");

                // Refetch table data
                this.page = 1;
                await this.getDetailProfile();
            } else {
                this.showAlert('error', 'Failed to update profile settings. Please try again.');
                this.toggleAlertWithTimeout("isAlertShown");
            }
        } catch (error: any) {
            console.error('Error updating profile:', error);
            this.showAlert('error', 'An error occurred while updating profile settings.');
            this.toggleAlertWithTimeout("isAlertShown");
        } finally {
            this.setLoading(false);
            if (this.displayAlertEditProfileSuccessfulTimeOut) {
                clearTimeout(this.displayAlertEditProfileSuccessfulTimeOut);
            }
            this.displayAlertEditProfileSuccessfulTimeOut = setTimeout(() => {
                if (this.displayAlertEditProfileSuccessfull) {
                    this.displayAlertEditProfileSuccessfull = false;
                }
            }, 8000);
        }
    }

    /**
     * Restore profile data structure from edited values
     * Converts testsValues back to tests array, visitsValues back to visits array, etc.
     */
    private restoreProfileDataStructure(row: any, index: number): void {
        const rawData = this.profileDataTableRaw.get(index);
        if (!rawData) return;

        // Restore tests array from testsValues (IDs)
        if (row.testsValues && Array.isArray(row.testsValues)) {
            row.tests = row.testsValues.map((valueId: string) => {
                const [id, version] = valueId.split('@');
                return {
                    studyTestId: id,
                    testName: this.testOptions.find(t => t.id === valueId)?.text || '',
                    versionNumber: parseInt(version)
                };
            });
            // Update display
            row.testsDisplay = row.tests.map((t: any) => t.testName).join('; ') || '-';
        }

        // Restore visits array from visitsValues (IDs)
        if (row.visitsValues && Array.isArray(row.visitsValues)) {
            row.visits = row.visitsValues.map((valueId: string) => {
                const [id, version] = valueId.split('@');
                return {
                    visitId: id,
                    visitName: this.visitOptions.find(v => v.id === valueId)?.text || '',
                    versionNumber: parseInt(version)
                };
            });
            // Update display
            row.visitsDisplay = row.visits.map((v: any) => v.visitName).join('; ') || '-';
        }

        // Restore cohort from cohortValue (ID)
        if (row.cohortValue) {
            const [cohortId, version] = String(row.cohortValue).split('@');
            row.cohortId = cohortId;
            row.cohortName = this.cohortOptions.find(c => c.id === row.cohortValue)?.text || row.cohortName;
        }

        // Restore blindOrHide from display format back to code format
        if (row.blindOrHide) {
            row.blindOrHide = row.blindOrHide === 'Blind' ? 'B' : (row.blindOrHide === 'Hide' ? 'H' : row.blindOrHide);
        }
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
            this.page--;
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
        const isKeyExisted = this.exceptedUserSelection.has(key);
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
        const filter = this.filterForm.value;
        this.page = 1;
        this.getDetailProfile();
    }

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
        this.selectedProfile = null;
        this.profiles = [];
        this.profileOptions = [];
        this.page = 1;
        this.getReportProfilesByProtocol();
        this.resetFilters();
        this.getFilterDropdownData();

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

    onToggleProtocolDropdown(isOpen: boolean): void {
        if (!isOpen) {
            this.currentActivatedProtocolQueryParams = {
                ... this.currentActivatedProtocolQueryParams,
                page: 1,
                searchValue: '',
            }
            this.getActivatedProtocols();
        }
    }
    //#endregion

    //#region Profile logic

    selectProfile(profile: Profile) {
        if (this.selectedProfile == profile) { return; }
        this.selectedProfile = profile;
        this.page = 1;
        this.getDetailProfile();
        this.getFilterDropdownDataByProFile();
        this.loadCohortTestsMappingForValidation();
    }

    onToggleProfileCheckbox(profile: Profile): void {
        if (this.selectedProfileByCheckbox.has(profile)) {
            this.selectedProfileByCheckbox.delete(profile);
        } else {
            this.selectedProfileByCheckbox.add(profile);
        }
    }

    isProfileChecked(profile: Profile): boolean {
        return this.selectedProfileByCheckbox.has(profile);
    }

    searchProfile(value: string = '') {
        if (value == null || value == undefined) { return }
        this.profilesLazyLoadingParam.searchValue = value;
        this.profiles = [];
        this.profileOptions = [];
        this.getReportProfilesByProtocol();
    }
    //#endregion

    //#region Add Profile Modal logic
    onCloseProtocolRequiredModal() {
        this.showProtocolRequiredModal = false;
    }
    onOpenAddProfilePopup() {
        if (!this.selectedProtocol) {
            this.showProtocolRequiredModal = true;

        } else {
            this.showAddProfileModal = true;
        }
    }

    onCloseAddProfilePopup() {
        this.showAddProfileModal = false;
    }
    onSaveAddprofilePopup(data: AddProfileModalData) {
        this.saveReportProfile(data)
    }
    showAlert(alertType: AlertType, content: string) {
        this.displayAlert = {
            ...this.displayAlert,
            alertType,
            title: alertType === 'success' ? 'Success!' : 'Failed!',
            subtitle: content,
        }
    }
    private alertTimeout: any;

    toggleAlertWithTimeout(
        alertKey: 'isAlertShown',
        duration = 8000
    ): void {
        if (this.alertTimeout) {
            clearTimeout(this.alertTimeout);
        }
        this[alertKey] = true;
        this.alertTimeout = setTimeout(() => {
            this[alertKey] = false;
        }, duration);
    }
    onCloseAlert() {
        this.isAlertShown = false;
    }
    //#endregion

    //#region Handle API Calls
    async getActivatedProtocols(shouldResetCurrent: boolean = false) {
        try {
            this.isLoadingProtocols = true;
            this.setSkeletonLoading(true);

            const response = await firstValueFrom(
                this.adminManagementService.getActivatedProtocols(this.currentActivatedProtocolQueryParams).pipe(
                    debounceTime(300),
                    distinctUntilChanged()
                ));
            this.protocols = shouldResetCurrent ? response.items ?? [] : [... this.protocols, ...response.items];
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

    capitalizeFirstletter(str: string): string {
        if (!str) return str;
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    async getDetailProfile() {
        if (!this.selectedProtocol) return;
        try {
            this.setLoading(true);
            const queryParams = {
                studyId: this.selectedProtocol?.protocolId,
                profileId: this.selectedProfile?.profileId,
                studyTestIds: this.selectedTestId.length > 0 ? this.selectedTestId.map((x: any) => ({ studyTestId: x.actualId, versionNumber: x.versionNumber })) : null,
                cohortIds: this.selectedCohortId.length > 0 ? this.selectedCohortId.map((x: any) => ({ cohortId: x.actualId, versionNumber: x.versionNumber })) : null,
                visitIds: this.selectedVisitId.length > 0 ? this.selectedVisitId.map((x: any) => ({ visitId: x.actualId, versionNumber: x.versionNumber })) : null,
                blindOrHide: this.filterForm.get('blindOrHide')?.value === 'Blind' ? 'B' : (this.filterForm.get('blindOrHide')?.value === 'Hide' ? 'H' : null),
                searchFields: [
                    null
                ],
                searchValue: this.searchForm.get('searchText').value || "",
                sortField: this.capitalizeFirstletter(this.sortField),
                sortDirection: this.sortType,
                currentPage: this.page,
                pageSize: this.pageSize
            }
            const response = await firstValueFrom(this.adminManagementService.getDetailProfile(this.selectedProtocol?.protocolId, queryParams));
            this.profileDataTable = response?.items || [];
            this.transformProfileDataForTable();
            // this.associatedUsers response.items;
            this.totalUsers = response?.totalCount || 0;
            this.setLoading(false);
        }
        catch (error) {
            this.selectedProtocol = null;
        }
        finally {
            this.setLoading(false);
        }
    }

    /**
     * Transform profile data from API for table display
     * Converts nested arrays (tests, visits) to display format and maintains edit values
     */
    private transformProfileDataForTable(): void {
        this.profileDataTableRaw.clear();

        this.profileDataTable = this.profileDataTable.map((item: any, index: number) => {
            // Store original data for reference
            this.profileDataTableRaw.set(index, JSON.parse(JSON.stringify(item)));

            // Transform tests array
            const testsDisplay = item.tests
                ?.map((t: any) => t.testName)
                .join('; ') || '-';

            const testsValues = item.tests
                ?.map((t: any) => `${t.studyTestId}@${t.versionNumber}`)
                || [];

            // Transform visits array
            const visitsDisplay = item.visits
                ?.map((v: any) => v.visitName)
                .join('; ') || '-';

            const visitsValues = item.visits
                ?.map((v: any) => `${v.visitId}@${v.versionNumber}`)
                || [];

            // Format cohort value for editing - find version from cohortOptions
            let cohortValue = item.cohortId;
            if (item.cohortId && this.cohortOptions.length > 0) {
                const cohortOption = this.cohortOptions.find((c: any) => c.actualId === item.cohortId);
                if (cohortOption) {
                    cohortValue = cohortOption.id; // This is already in format ${id}@${version}
                }
            }

            return {
                ...item,
                testsDisplay,
                testsValues,
                visitsDisplay,
                visitsValues,
                cohortValue,
                blindOrHide: item.blindOrHide === 'B' ? 'Blind' : (item.blindOrHide === 'H' ? 'Hide' : '-')
            };
        });
    }

    async getFilterDropdownData() {
        try {
            this.setLoading(true);
            const queryParams = {
                protocolId: this.selectedProtocol?.protocolId
            }
            const filterResponse = await firstValueFrom(
                this.adminManagementService.getDropDownFilterProfile(queryParams)
            );
            // Extract studyId from filterResponse
            this.studyId = filterResponse?.studyId || null;
            this.testOptions = filterResponse?.tests?.map((t: any) => ({
                text: t.testName,
                actualId: t.studyTestId,
                id: t.studyTestId + '@' + t.versionNumber,
                versionNumber: t.versionNumber
            }));
            this.cohortOptions = filterResponse?.cohorts.map((c: any) => ({
                text: c.cohortName,
                actualId: c.cohortId,
                id: c.cohortId + '@' + c.versionNumber,
                versionNumber: c.versionNumber
            }));
            this.visitOptions = filterResponse?.visits.map((v: any) => ({
                text: v.visitName,
                actualId: v.visitId,
                id: v.visitId + '@' + v.versionNumber,
                versionNumber: v.versionNumber
            }));
        } catch (error) {
            console.log(error);
        } finally {
            this.setLoading(false);
        }
    }

    async getFilterDropdownDataByProFile() {
        try {
            this.setLoading(true);
            const queryParams = {
                profileId: this.selectedProfile?.profileId
            }
            const filterResponse = await firstValueFrom(
                this.adminManagementService.getDropDownFilterTableByProfile(queryParams)
            );
            this.testOptions = filterResponse?.tests?.map((t: any) => ({
                text: t.testName,
                actualId: t.studyTestId,
                id: t.studyTestId + '@' + t.versionNumber,
                versionNumber: t.versionNumber
            }));
            this.cohortOptions = filterResponse?.cohorts.map((c: any) => ({
                text: c.cohortName,
                actualId: c.cohortId,
                id: c.cohortId + '@' + c.versionNumber,
                versionNumber: c.versionNumber
            }));
            this.visitOptions = filterResponse?.visits.map((v: any) => ({
                text: v.visitName,
                actualId: v.visitId,
                id: v.visitId + '@' + v.versionNumber,
                versionNumber: v.versionNumber
            }));
            // Keep the ByProfile versions for potential future use
            this.testOptionsByProfile = this.testOptions;
            this.cohortOptionsByProfile = this.cohortOptions;
            this.visitOptionsByProfile = this.visitOptions;
        } catch (error) {
            console.log(error);
        } finally {
            this.setLoading(false);
        }
    }

    async getReportProfilesByProtocol() {
        if (!this.selectedProtocol?.protocolId) return;
        this.profilesLazyLoadingParam.protocolId = this.selectedProtocol.protocolId;
        try {
            this.isLoadingMoreProfile = true;
            const response = await firstValueFrom(this.adminManagementService.getReportProfilesByProtocol(this.profilesLazyLoadingParam))
            // Append the loading profiles to the current one
            const loadingProfiles = (response.items ?? []) as Profile[];
            this.profiles = [...this.profiles, ...loadingProfiles];
            this.totalProfiles = response.totalCount;
            // Set profile list options and default profile
            if (!this.selectedProfile) this.selectedProfile = loadingProfiles.find(p => p.isDefault === true) || null;
            this.getDetailProfile();
            this.getFilterDropdownDataByProFile();
            this.loadCohortTestsMappingForValidation();
            this.profileOptions = this.profiles.map(p => ({ id: p.profileId, text: p.profileName }))
        } catch (error: any) {
            console.log(error)
        } finally {
            this.isLoadingMoreProfile = false;
        }
    }

    async saveReportProfile(data: AddProfileModalData) {
        this.isAddingProfile = true;
        try {
            const response = await firstValueFrom(this.adminManagementService.addReportProfile({
                profileName: data.profileName,
                protocolId: data.protocolId
            }))
            if (response?.success) {
                const content = `${data.profileName} is added to the list Profile for ${this.selectedProtocol?.studyCode} successfully.`
                this.showAlert('success', content)
            } else {
            }
            this.showAlert('error', 'Please try again.')
            // reload again the current page
            this.profiles = []
            await this.getReportProfilesByProtocol();
        } catch (error: any) {
            console.log(error)
            this.showAlert('error', 'Please try again.')
        } finally {
            this.isAddingProfile = false;
            this.showAddProfileModal = false;
            this.toggleAlertWithTimeout("isAlertShown");
        }
    }
    //#endregion

    onClickAddNewProfile() {
        this.tableComponent!.addNewProfile = true;
    }
    addNewProfileSuccessfully() {
        this.toggleAlertWithTimeout("isAlertShown");
        this.showAlert('success', `The Blind/Hide configuration for this ${this.selectedProtocol?.studyCode} has been saved successfully.`)
    }
    // Remove profile
    async onBulkDeleteReportProfiles(status: any) {
        if (status === 0) {
            this.removeProfileLoading = !this.removeProfileLoading;
        } else {
            this.showRemoveProfileModal = true;
            try {
                const selectedProfileIds = new Set<any>();
                this.selectedProfileByCheckbox.forEach((u: any) => {
                    selectedProfileIds.add(u.profileId);
                });
                const response = await firstValueFrom(this.adminManagementService.bulkDeleteReportProfiles({
                    profileIds: [...selectedProfileIds]
                }));
                if (response?.success) {
                    const ids = [...this.selectedProfileNames].join(',');
                    const content = `The ${ids} ${this.selectedProfileNames && this.selectedProfileNames.size > 1 ? 'are' : 'is'} removed from ${this.selectedProtocol?.studyCode} successfully.`
                    this.showAlert('success', content)
                } else {
                    this.showAlert('error', 'Please try again.')
                }
                // reload again the current page
                this.profiles = []
                this.selectedProfileByCheckbox.clear();
                await this.getReportProfilesByProtocol();
            } catch (error: any) {
                this.showAlert('error', 'Please try again.')
            } finally {
                this.removeProfileLoading = false;
                this.showRemoveProfileModal = false;
                this.toggleAlertWithTimeout("isAlertShown");
            }
        }
    }

    selectedProfileNames: Set<any> = new Set<any>();

    onRemoveProfile(data: any) {
        this.selectedProfileNames.clear();
        this.selectedProfileByCheckbox.forEach((u: any) => {
            this.selectedProfileNames.add(u.profileName);
        });
        this.showRemoveProfileModal = !this.showRemoveProfileModal;
    }
    handleDisplayAlertBlindHiddenError() {
        if (this.displayAlertHiddenBlindErrorTimeOut) clearTimeout(this.displayAlertHiddenBlindErrorTimeOut);
        this.displayAlertHiddenBlindError = true
        this.displayAlertHiddenBlindErrorTimeOut = setTimeout(() => {
            if (this.displayAlertHiddenBlindError) {
                this.displayAlertHiddenBlindError = false;
            }
        }, 8000)
    }

    // Remove Blind/Hide
    async onRemoveBlindHideAPI(status: any) {
        if (status == 0) {
            this.showRemoveBlindHideModal = !this.showRemoveBlindHideModal;
        } else {
            this.removeRemoveBlindHideLoading = true;
            try {
                const payload = {
                    profileSettingIds: this.selectedReportUserIds,
                    isDeleteAll: this.selectedAllReportUser
                }
                const response = await firstValueFrom(this.adminManagementService.deleteReportProfileSettings(payload))
                if (response?.success) {
                    const content = `The Blind/Hide Configuration is removed from the Profile successfully.`
                    this.showAlert('success', content)
                } else {
                    this.showAlert('error', 'Please try again.')
                }
                // reload again the current page
                this.profileDataTable = [];
                await this.getDetailProfile();
            } catch (error: any) {
                console.log(error)
                this.showAlert('error', 'Please try again.');
            } finally {
                this.removeRemoveBlindHideLoading = false;
                this.showRemoveBlindHideModal = false;
                this.toggleAlertWithTimeout("isAlertShown");
            }
        }
    }

    onRemoveBlindHide() {
        this.showRemoveBlindHideModal = !this.showRemoveBlindHideModal;
    }

    //#region Cohort-Test Validation Methods
    /**
     * Validates if all selected tests belong to the same cohort
     * @param selectedTestIds Array of selected test IDs (format: "testId@version")
     * @returns The cohort ID if all tests are from same cohort, null otherwise
     */
    validateTestsCohortCompatibility(selectedTestIds: string[]): string | null {
        if (!selectedTestIds || selectedTestIds.length === 0) {
            return null;
        }

        const cohortIds = new Set<string>();

        // Iterate through cohortTestsMapping to find which cohort each test belongs to
        for (const [cohortId, testIds] of this.cohortTestsMapping) {
            const matchingTests = selectedTestIds.filter(testId => testIds.includes(testId));
            if (matchingTests.length > 0) {
                cohortIds.add(cohortId);
            }
        }

        // If tests belong to only one cohort, validation passes
        if (cohortIds.size === 1) {
            return Array.from(cohortIds)[0];
        }

        // If tests belong to multiple cohorts, validation fails
        return null;
    }

    /**
     * Show validation error message with auto-clear timeout
     */
    showTestCohortValidationError(message: string = 'Selected tests must belong to the same cohort'): void {
        this.testCohortValidationError = message;
        this.displayTestCohortValidationError = true;

        // Auto-clear after 5 seconds
        if (this.testCohortValidationErrorTimeOut) {
            clearTimeout(this.testCohortValidationErrorTimeOut);
        }
        this.testCohortValidationErrorTimeOut = setTimeout(() => {
            this.clearTestCohortValidationError();
        }, 5000);
    }

    /**
     * Clear validation error message
     */
    clearTestCohortValidationError(): void {
        this.testCohortValidationError = '';
        this.displayTestCohortValidationError = false;
        if (this.testCohortValidationErrorTimeOut) {
            clearTimeout(this.testCohortValidationErrorTimeOut);
        }
    }

    /**
     * Handle test selection change in edit mode
     * Called from reusable-table when tests are selected
     */
    onTestsSelectionChangeInEdit(selectedTestIds: string[], rowIndex?: number): void {
        const commonCohortId = this.validateTestsCohortCompatibility(selectedTestIds);

        if (commonCohortId === null && selectedTestIds.length > 0) {
            // Multiple cohorts detected - show error
            this.showTestCohortValidationError('Selected tests must belong to the same cohort');
        } else {
            // Valid selection - clear error
            this.clearTestCohortValidationError();
        }
    }

    /**
     * Load cohort-test mapping from API for validation purposes
     * This uses getTestsAndCohorts API to populate cohortTestsMapping
     */
    async loadCohortTestsMappingForValidation(): Promise<void> {
        try {
            if (!this.selectedProfile?.profileId) {
                return;
            }

            const queryParams = {
                profileId: this.selectedProfile.profileId
            };

            const response = await firstValueFrom(
                this.adminManagementService.getTestsAndCohorts(queryParams)
            );

            // Clear existing mapping
            this.cohortTestsMapping.clear();

            // Parse response and populate cohort-tests mapping
            const cohortsData = response?.data?.cohorts || [];
            cohortsData.forEach((cohort: any) => {
                // Map tests to cohort
                const testIds = cohort.tests?.map((t: any) => t.studyTestId + '@' + t.versionNumber) || [];
                this.cohortTestsMapping.set(cohort.cohortId, testIds);
            });
        } catch (error) {
            console.error('Error loading cohort-tests mapping:', error);
        }
    }
    //#endregion
}
//#endregion