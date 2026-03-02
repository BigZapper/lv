import { Component, EventEmitter, Input, Output, OnInit, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { AdminManagement Service } from '@app/shared/services';
import { EmptyMessage } from '@app/shared/utils';
import { DialogActions } from '@app/store/dialog';
import { Store } from '@ngrx/store';
import { firstValueFrom, Subject } from 'rxjs';
export interface SelectionOption {
    id: string;
    text: string;
    selected?: boolean;
}
export interface TableColumn {
    title: string;
    key: string;
    sortable?: boolean;
    class?: string;
    classData?: string;
    isCheckBox?: boolean;
    isAction?: boolean;
    sortField?: string;
    widthColumn?: string;
    editable?: boolean;
    multiSelect?: boolean;
    alloptionsText?: string;
}
export interface SortEvent {
    column: string;
    direction: 'asc' | 'desc' | 'none';
}
export type AllCheckboxState = 'all-unchecked' | 'all-checked' | 'some-unchecked' | 'some-checked';

export interface CheckboxEvent {
    allCheckboxState: AllCheckboxState;
    exceptionKeyList?: string[];
    exceptionIndexList?: number[];
    changedIndex?: number;
    changedKey?: string;
    changeType: 'single' | 'all' // single when user clicks only one checkbox and all for clicking the button checkbox all
    valueType: 'key' | 'index' // if it is index, the value will be number
}

export interface EditableRowUpdate {
    index: number;
    row: any;
}

export interface EditOptionsMap {
    testId?: SelectionOption[];
    cohortId?: SelectionOption[];
    visitId?: SelectionOption[];
    blideOrHide?: SelectionOption[];
    [key: string]: SelectionOption[] | undefined;
}
@Component({
    selector: 'app-reusable-table',
    templateUrl: './reusable-table.component.html',
    styleUrls: ['./reusable-table. component. scss']
})
export class ReusableTableComponent implements OnInit {
    @Input() columns: TableColumn[] = [];
    @Input() data: any[] = [];
    @Input() dataKey?: string; // Assume that this key is exist in data
    @Input() showSortIcon = true;
    @Input() defaultSortColumn?: string;
    @Input() sortField?: any = '';
    @Input() defaultSortDirection: 'asc' | 'desc' = 'asc';
    @Input() emptyMessage = EmptyMessage;
    @Output() sortChange = new EventEmitter<SortEvent>();
    @Input() isScrollY = false;
    @Input() isNoBorder = false;
    @Input() isTableReportAdmin = false;
    @Input() tableLayout = 'auto';
    @Output() editUserEvent = new EventEmitter<any>();
    @Output() manageReportPermissionsEvent = new EventEmitter<any>();
    @Output() clickTestLink = new EventEmitter<string>();
    @Output() checkboxChange = new EventEmitter<CheckboxEvent>();
    @Output() clickEditProfile = new EventEmitter<any>();
    @Output() addNewProfileSuccessfully = new EventEmitter<any>();
    @Input() allCheckboxState: AllCheckboxState = 'all-unchecked';
    @Input() profileStatusOptions: any[] = [];
    @Input() testOptions: any[] = [];
    @Input() cohortOptions: any[] = [];
    @Input() visitOptions: any[] = [];
    @Input() totalData: number = 0; // Add total data to ensure checkbox state is correct with all-checked state
    @Input() currentSort: { [key: string]: 'asc' | 'desc' | 'none' } = {};
    isCheckedAllbox = false;
    // Edit mode inputs
    @Input() enableEdit = false;
    @Input() editOptions: EditOptionsMap = {};
    @Input() editKeyMap: Record<string, string> = {}; // Map display keys to actual edit value keys (e.g., 'testsDisplay' -> 'testsValues')
    @Output() rowUpdated = new EventEmitter<EditableRowUpdate>();
    @Output() editCanceled = new EventEmitter<number>();

    exceptionCheckboxByIndex = new Set<number>();
    exceptionCheckboxByKey = new Set<string>();
    addNewProfile = false;
    selectedTestId = [];
    selectedCohortId = [];
    selectedVisitId = [];

    editRowIndex: number | null = null;
    editRowValues: Record<string, string[]> = {};
    @Output() selectedItem = new EventEmitter<any>();
    @Output() selectedItemAll = new EventEmitter<any>();

    @ViewChild('tBody') tBody !: ElementRef;
    userActions = [
        {
            id: 'editUserDetails',
            name: "Edit User's Details",
            disable: false
        },
        {
            id: 'manageReportPermissions',
            name: "Manage Report Permissions - User",
            disable: false
        }
    ]
    ngOnInit(): void {
        // Set default sort if provided
        if (this.defaultSortColumn) {
            this.currentSort[this.defaultSortColumn] = this.defaultSortDirection;
            this.sortChange.emit({
                column: this.defaultSortColumn,
                direction: this.defaultSortDirection
            });
        }
        if (this.currentSort) {
            this.sortChange.emit({
                column: this.sortField,
                direction: this.currentSort[this.sortField] || ''
            });
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.data) {
            if (this.tBody) {
                const tbodyElement = this.tBody.nativeElement;
                tbodyElement.style.height = `auto`;
            }
        }
        if (changes.allCheckboxState) {
            const allCheckboxState = changes.allCheckboxState.currentValue as AllCheckboxState;
            if (allCheckboxState === 'all-checked' || allCheckboxState === 'all-unchecked') {
                this.clearAllBoxes();
            }
        }
    }

    get isCheckedAllBox(): boolean {
        return this.allCheckboxState === 'all-checked';
    }
    isCheckedBox(index: number): boolean {
        if (!!this.dataKey) {
            const isKeyExisted = this.exceptionCheckboxByKey.has(this.data[index][this.dataKey]);
            return this.allCheckboxState === 'all-checked' || this.allCheckboxState === 'some-unchecked' ? !isKeyExisted : isKeyExisted;

        }
        const isIndexExisted = this.exceptionCheckboxByIndex.has(index);
        return this.allCheckboxState === 'all-checked' || this.allCheckboxState === 'some-unchecked' ? !isIndexExisted : isIndexExisted;
    }

    private clearAllBoxes() {
        this.exceptionCheckboxByIndex.clear();
        this.exceptionCheckboxByKey.clear();
    }

    updateAllCheckboxState() {
        const exceptionCheckboxSize = !!this.dataKey ? this.exceptionCheckboxByKey.size : this.exceptionCheckboxByIndex.size;
        if (this.allCheckboxState === 'all-checked' || this.allCheckboxState === 'some-unchecked') {
            this.allCheckboxState = exceptionCheckboxSize === 0 ? 'all-checked' : 'some-unchecked'
        } else {
            this.allCheckboxState = exceptionCheckboxSize === 0 ? 'all-unchecked' : 'some-checked'
        }
    }

    toggleSingleCheckboxByIndex(index: number) {
        if (this.exceptionCheckboxByIndex.has(index)) {
            this.exceptionCheckboxByIndex.delete(index);
        } else {
            this.exceptionCheckboxByIndex.add(index);
        }
        this.updateAllCheckboxState();
    }

    toggleSingleCheckboxByKey(key: string) {
        if (this.exceptionCheckboxByKey.has(key)) {
            this.exceptionCheckboxByKey.delete(key);
        } else {
            this.exceptionCheckboxByKey.add(key);
        }
        this.updateAllCheckboxState();
    }
    toggleSingleCheckbox(index: number): void {
        if (!!this.dataKey) {
            this.toggleSingleCheckboxByKey(this.data[index][this.dataKey])
        } else {
            this.toggleSingleCheckboxByIndex(index);
        }
    }
    toggleAllCheckbox() {
        this.allCheckboxState = this.isCheckedAllBox ? 'all-unchecked' : 'all-checked';
        this.clearAllBoxes();
    }

    onClickCheckBoxAll() {
        this.toggleAllCheckbox();
        this.checkboxChange.emit({
            changeType: 'all',
            valueType: !!this.dataKey ? 'key' : 'index',
            allCheckboxState: this.allCheckboxState,
            exceptionIndexList: !!this.dataKey ? undefined : Array.from(this.exceptionCheckboxByIndex),
            exceptionKeyList: !!this.dataKey ? Array.from(this.exceptionCheckboxByKey) : undefined,
        })
    }

    onClickCheckBox(row: any, index: number, checked: any) {
        this.toggleSingleCheckbox(index);
        this.checkboxChange.emit({
            changeType: 'single',
            valueType: !!this.dataKey ? 'key' : 'index',
            allCheckboxState: this.allCheckboxState,
            changedIndex: !!this.dataKey ? undefined : index,
            changedKey: !!this.dataKey ? this.data[index][this.dataKey] : undefined,
            exceptionIndexList: !!this.dataKey ? undefined : Array.from(this.exceptionCheckboxByIndex),
            exceptionKeyList: !!this.dataKey ? Array.from(this.exceptionCheckboxByKey) : undefined,

        })

        const id = row?.profileSettingId;
        if (!id) return;

        const idStr = String(id);
        if (checked) {
            this.selectedReportUserIds.add(idStr);
        } else {
            this.selectedReportUserIds.delete(idStr);
        }
        const selectedReportUserIds = Array.from(this.selectedReportUserIds);
        this.selectedItem.emit(selectedReportUserIds);
    }

    navigateToTestDetails(data: any) {
        this.clickTestLink.emit(data);
    }
    onHeaderClick(column: TableColumn): void {
        if (!column.sortable && !this.showSortIcon) return;
        if (!column.sortable && this.isTableReportAdmin) return;
        const currentDirection = this.currentSort[column.key] || 'none';
        let newDirection: 'asc' | 'desc' | 'none';

        // If column is not sorted, start with asc
        // If already sorted, toggle between asc and desc only
        if (currentDirection === 'none') {
            newDirection = 'asc';
        } else if (currentDirection === 'asc') {
            newDirection = 'desc';
        } else {
            newDirection = 'asc'; // Toggle back to asc instead of none
        }


        // Reset other columns to none
        Object.keys(this.currentSort).forEach(key => {
            if (key !== column.key) {
                this.currentSort[key] = 'none';
            }
        });

        this.currentSort[column.key] = newDirection;
        if (!column?.sortable) {
            return;
        }
        this.sortChange.emit({ column: column.sortField || column.key, direction: newDirection });
    }

    TD_WIDTH = 150; // Default width for td, can be customized based on column

    getTooltipRow(aliases: string[]) {
        let visible: string[] = [];
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        for (let i = 0; i < aliases.length; i++) {
            visible.push(aliases[i]);
            const remaining = aliases.length - i - 1;
            const testText = visible.join(', ') + (remaining > 0 ? ` +${remaining} more` : '');
            const textWidth = context.measureText(testText).width;
            if (textWidth > this.TD_WIDTH) {
                visible.pop();
                break;
            }
        }
        const hiddenCount = aliases.length - visible.length;
        return {
            display:
                hiddenCount > 0
                    ? `${visible.join(', ')}, +${hiddenCount} more`
                    : visible.join(', '),
            isTooltip: hiddenCount > 0,
            fullContent: this.mapArrToString(aliases)
        }
    }

    getCellValue(row: any, columnKey: string): any {
        if (this.isTooltipColKey(row, columnKey)) {
            if (this.getTooltipRow(row[columnKey])?.isTooltip) {
                return this.getTooltipRow(row[columnKey]) || '-';
            }
            return this.mapArrToString(row[columnKey])
        }
        if (this.isTableReportAdmin && this.isArrayDataColumn(columnKey)) {
            return row[columnKey].map((s: any) => s.siteNumber || s.regionName || s.countryName).join(', ') || '-';

        }

        if (this.isTableReportAdmin && columnKey === 'role') {
            return row[columnKey]?.roleName || '-';
        }

        if (this.isTableReportAdmin && columnKey === 'blindOrHide') {
            return row[columnKey] === 'B' ? 'Blind' : 'Hide';
        }

        if (Array.isArray(row[columnKey])) {
            if (row[columnKey].length === 0) return '-';
            // Check if all options are selected for this column
            const column = this.columns.find(col => col.key === columnKey);
            if (column && column.allOptionsText && this.editOptions[columnKey]) {
                const availableOptions = this.editOptions[columnKey] || [];
                // Filter out the "All..." option itself from the count
                const actualOptions = availableOptions.filter(opt => !opt.text.startsWith('All'));
                // If all actual options are selected, show "All ..." text
                if (actualOptions.length > 0 && row[columnKey].length === actualOptions.length) {
                    const allSelected = actualOptions.every(opt => row[columnKey].includes(opt.id));
                    if (allSelected) {
                        return column.allOptionsText;
                    }
                }
            }
            return row[columnKey].join('; ');
        }

        return row[columnKey] || '-';
    }
    mapArrColumn(arr: any): any {
        if (!arr) return '-';
        return Array.isArray(arr) ? arr.join(', ') : arr;
    }

    isLinkColumn(columnKey: string): boolean {
        // Columns that should render as links
        return ['testName', 'testCode'].includes(columnKey);
    }
    isStatusColumn(columnKey: string): boolean {
        return columnKey === 'status';
    }

    isTooltipColKey(row: any, columnKey: string): boolean {
        // Columns that should render as links;
        if (row[columnKey] && row[columnKey].length > 1)
            return ['testAlias'].includes(columnKey);
        return false;
    }
    isArrayDataColumn(columnKey: string): boolean {
        return ['sites', 'regions', 'countries', 'tests', 'visits'].includes(columnKey);
    }
    formatAliasDisplay(aliases: string[]): string {
        if (!aliases || aliases.length === 0) {
            return '-';
        }
        if (aliases.length === 1) {
            return aliases[0];
        }
        return `${aliases[0]}, +${aliases.length - 1} more`;
    }
    isSorted(columnKey: string): boolean {
        return (this.currentSort[columnKey] && this.currentSort[columnKey] !== 'none') || (this.sortField && columnKey?.toLocaleLowerCase() === this.sortField?.toLocaleLowerCase());
    }
    onClickEdit(data: any) {
        this.clickEditProfile.emit(data);
    }
    onItemClick(event: any, data: any) {
        if (event.actionId === 'editUserDetails') {
            const normalizedData = this.normalizeEmptyToDash(data);
            this.editUserEvent.emit(normalizedData);
        } else if (event.actionId === 'manageReportPermissions') {
            this.manageReportPermissionsEvent.emit(data);
        }
    }
    normalizeEmptyToDash(obj: any): any {
        const result: any = {};
        Object.keys(obj).forEach(key => {
            const value = obj[key];
            result[key] = value === '' || value === null || value === undefined ? '-' : value;
        });
        return result;
    }
    setTbodyHeight(count: number) {
        if (this.tBody) {
            const tbodyElement = this.tBody.nativeElement;
            const currentHeight = tbodyElement.clientHeight; // Get current height
            const newHeight = currentHeight + count; // Add 100px

            tbodyElement.style.height = `${newHeight}px`; // Apply new height
        }
    }

    scrollToTop(id: string) {
        const element = document.getElementById(id) as HTMLElement;
        if (element) {
            setTimeout(function () {
                element.scrollIntoView({ behavior: 'auto', block: 'center' });
            }, 100);
        }
    }

    minHeight = '';
    onDropdownAction(event: any, index: any) {
        const liCount = document.querySelectorAll('#myList li').length;
        const total = liCount ? liCount : 0;
        const height = (total > 2 ? 3 : total) * 38 + 10;

        if (event === 'hidden') {
            this.setTbodyHeight(-height);
            this.minHeight = '0px';
        } else {
            if (index >= this.data?.length - 2) {
                this.scrollToTop('user-action' + index);
                this.minHeight = '199px';
                this.setTbodyHeight(height);
            }
        }
    }

    // Edit mode methods
    startEdit(row: any, index: number): void {
        this.editRowIndex = index;
        this.editRowValues = {};

        // Initialize edit values for all editable columns
        this.columns.forEach(column => {
            if (column.editable && !column.isAction && !column.isCheckBox) {
                // Use editKeyMap to get the actual value key if mapped
                const valueKey = this.editKeyMap[column.key] || column.key;
                const value = row?.[valueKey];
                // If value is already an array, use it; otherwise wrap in array
                this.editRowValues[column.key] = Array.isArray(value) ? [...value] : (value ? [value] : []);
            }
        });
    }

    cancelEdit(index: number): void {
        this.editRowIndex = null;
        this.editRowValues = {};
        this.editCanceled.emit(index);
    }

    saveEdit(row: any, index: number): void {
        if ((this.editRowValues['testId'] || []).length === 0 || (this.editRowValues['cohortId'] || []).length === 0 || (this.editRowValues['visitId'] || []).length === 0 || (this.editRowValues['blindOrHide'] || []).length === 0) return

        const updatedRow = { ...row };
        // Update all editable columns with new values
        this.columns.forEach(column => {
            if (column.editable && !column.isAction && !column.isCheckBox) {
                const selectedValues = this.editRowValues[column.key] || [];
                // Use editKeyMap to get the actual value key if mapped
                const valueKey = this.editKeyMap[column.key] || column.key;

                if (selectedValues.length > 0) {
                    // Keep as array if multiSelect, otherwise take first value
                    updatedRow[valueKey] = column.multiSelect !== false ? [...selectedValues] : selectedValues[0];
                }
            }
        });
        this.data[index] = updatedRow;
        this.rowUpdated.emit({ index, row: updatedRow });
        this.editRowIndex = null;
        this.editRowValues = {};
    }

    isEditing(index: number): boolean {
        return this.editRowIndex === index;
    }

    isEditableColumn(key: string): boolean {
        const column = this.columns.find(col => col.key === key);
        return column?.editable === true;
    }

    getOptions(key: keyof EditOptionsMap): SelectionOption[] {
        return this.editOptions[key] ?? [];
    }

    getEditLabel(key: string): string {
        const column = this.columns.find(col => col.key === key);
        return column?.title || '';
    }

    /**
     * Handle cohort selection change in edit mode
     * Reset visitId when cohortId is cleared
     */
    onEditCohortChange(selectedCohorts: string[]): void {
        this.editRowValues['cohortId'] = selectedCohorts;
        // Reset visitId if no cohort selected
        if (selectedCohorts.length === 0) {
            this.editRowValues['visitId'] = [];
        }
    }

    /**
     * Get edit row validation errors for all columns
     * Checks if cohort has empty selection
     * @returns Object with error states for each column key
     */
    get editRowErrors() {
        return (this.editRowValues['cohortId'] || []).length === 0
    }

    onClickCancleAddNewProfile() {
        this.addNewProfile = false;
    }
    onClickAddNewProfile() {
        if (this.selectedCohortId.length === 0 || this.selectedTestId.length === 0 || this.selectedVisitId.length === 0) return

        this.addNewProfile = false;
        this.addNewProfileSuccessfully.emit()
    }
    onSelectTest(data: any) {
        console.log('selected: ', data);
        this.selectedTestId = data;
        const selectedTestIds = Array.isArray(data)
            ? data.map((option: any) => option?.id).filter((id: string) => !!id)
            : [];
        if (this.onTestsSelectionChange) {
            this.onTestsSelectionChange(selectedTestIds, -1);
        }
    }
    onSelectCohort(data: any) {
        console.log('selected: ', data);
        this.selectedCohortId = data;
    }
    onSelectVisit(data: any) {
        console.log('selected: ', data);
        this.selectedVisitId = data;
    }
    onTestsChange(selectedTests: any[]): void {
        // Track selected Test IDs to preserve selection when data reloads
        console.log('Selected Tests:', selectedTests);
    }
    onLoadMoreTests(): void {
        console.log('test');
    }

    /**
     * Handle test selection change during edit mode
     * Calls parent component callback for validation
     */
    onEditTestsSelectionChange(selectedTestIds: string[], rowIndex: number): void {
        if (this.onTestsSelectionChange) {
            this.onTestsSelectionChange(selectedTestIds, rowIndex);
        }
    }
    get getVisitAddProfileError() {
        return !this.selectedTestId || this.selectedTestId?.length === 0;
    }
}