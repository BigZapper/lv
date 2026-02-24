import { Component, EventEmitter, Input, Output, OnInit, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { EmptyMessage } from '@app/shared/utils';

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
    isCheckBox?: boolean;
    isAction?: boolean;
    sortField?: string;
    editable?: boolean;
    multiSelect?: boolean;
    allOptionsText?: string;
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
    @Input() defaultSortDirection: 'asc' | 'desc' = 'asc';
    @Input() emptyMessage = EmptyMessage;
    @Output() sortChange = new EventEmitter<SortEvent>();
    @Input() isScrollY = false;
    @Input() isNoBorder = false;
    @Input() isTableReportAdmin = false;
    @Output() clickTestLink = new EventEmitter<string>();
    @Output() checkboxChange = new EventEmitter<CheckboxEvent>();
    
    // Edit mode inputs
    @Input() enableEdit = false;
    @Input() editOptions: EditOptionsMap = {};
    @Output() rowUpdated = new EventEmitter<EditableRowUpdate>();
    @Output() editCanceled = new EventEmitter<number>();

    currentSort: { [key: string]: 'asc' | 'desc' | 'none' } = ({});
    allCheckboxState: AllCheckboxState = 'all-unchecked';
    exceptionCheckboxByIndex = new Set<number>();
    exceptionCheckboxByKey = new Set<string>();

    editRowIndex: number | null = null;
    editRowValues: Record<string, string[]> = {};

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
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.data) {
            if (this.tBody) {
                const tbodyElement = this.tBody.nativeElement;
                tbodyElement.style.height = `auto`;
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

    onClickCheckBox(index: number) {
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
    getCellValue(row: any, columnKey: string): any {
        if (this.isTooltipColumn(row, columnKey)) {
            return this.formatAliasDisplay(row[columnKey]) || '-';
        }
        if (this.isTableReportAdmin && this.isArrayDataColumn(columnKey)) {
            return row[columnKey].map((s: any) => s.siteNumber || s.regionName || s.countryName).join(', ') || '-';

        }

        if (this.isTableReportAdmin && columnKey === 'role') {
            return row[columnKey]?.roleName || '-';
        }

        if (Array.isArray(row[columnKey])) {
            if (row[columnKey].length === 0) return '-';
            
            // Handle array of objects (tests, visits)
            if (typeof row[columnKey][0] === 'object') {
                if (columnKey === 'tests') {
                    const testNames = row[columnKey].map((test: any) => test.testName);
                    // Check if all tests are selected
                    const column = this.columns.find(col => col.key === columnKey);
                    if (column && column.allOptionsText && this.editOptions[columnKey]) {
                        const availableOptions = this.editOptions[columnKey] || [];
                        if (testNames.length === availableOptions.length) {
                            const allSelected = availableOptions.every(opt => 
                                testNames.includes(opt.text)
                            );
                            if (allSelected) {
                                return column.allOptionsText;
                            }
                        }
                    }
                    return testNames.join('; ');
                } else if (columnKey === 'visits') {
                    const visitNames = row[columnKey].map((visit: any) => visit.visitName);
                    // Check if all visits are selected
                    const column = this.columns.find(col => col.key === columnKey);
                    if (column && column.allOptionsText && this.editOptions[columnKey]) {
                        const availableOptions = this.editOptions[columnKey] || [];
                        if (visitNames.length === availableOptions.length) {
                            const allSelected = availableOptions.every(opt => 
                                visitNames.includes(opt.text)
                            );
                            if (allSelected) {
                                return column.allOptionsText;
                            }
                        }
                    }
                    return visitNames.join('; ');
                }
                // For other object arrays, try to get 'name' or 'text' property
                return row[columnKey].map((item: any) => item.name || item.text || item).join('; ');
            }
            
            // Check if all options are selected for this column (simple arrays)
            const column = this.columns.find(col => col.key === columnKey);
            if (column && column.allOptionsText && this.editOptions[columnKey]) {
                const availableOptions = this.editOptions[columnKey] || [];
                const actualOptions = availableOptions.filter(opt => !opt.text.startsWith('All '));
                
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
    getCellFullContect(row: any, columnKey: string): any {
        return row[columnKey] || '-';
    }
    isLinkColumn(columnKey: string): boolean {
        // Columns that should render as links
        return ['testName', 'testCode'].includes(columnKey);
    }
    isStatusColumn(columnKey: string): boolean {
        return columnKey === 'status';
    }

    isTooltipColumn(row: any, columnKey: string): boolean {
        // Columns that should render as links;
        if (row[columnKey] && row[columnKey].length > 1)
            return ['testAlias'].includes(columnKey);
        return false;
    }
    isArrayDataColumn(columnKey: string): boolean {
        return ['sites', 'regions', 'countries'].includes(columnKey);
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
        return this.currentSort[columnKey] && this.currentSort[columnKey] !== 'none';
    }
    onItemClick(event: any, data: any) {
        console.log('click event: ', event, ', data: ', data);
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

    onDropdownAction(event: any, index: any) {
        const liCount = document.querySelectorAll('#myList li').length;
        const total = liCount ? liCount : 0;
        const height = (total > 2 ? 3 : total) * 38 + 10;

        if (event === 'hidden') {
            this.setTbodyHeight(-height);
        } else {
            if (index >= this.data?.length - 2) {
                this.scrollToTop('user-action' + index);
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
                const value = row?.[column.key];
                
                // Handle array of objects (like tests, visits)
                if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
                    // Extract IDs from array of objects
                    if (column.key === 'tests') {
                        this.editRowValues[column.key] = value.map(item => item.studyTestId);
                    } else if (column.key === 'visits') {
                        this.editRowValues[column.key] = value.map(item => item.visitId);
                    } else {
                        this.editRowValues[column.key] = value.map(item => item.id || item);
                    }
                } else if (Array.isArray(value)) {
                    // Handle simple array
                    this.editRowValues[column.key] = [...value];
                } else if (value) {
                    // Handle single value
                    this.editRowValues[column.key] = [value];
                } else {
                    this.editRowValues[column.key] = [];
                }
            }
        });
    }

    cancelEdit(index: number): void {
        this.editRowIndex = null;
        this.editRowValues = {};
        this.editCanceled.emit(index);
    }

    saveEdit(row: any, index: number): void {
        const updatedRow = { ...row };
        
        // Update all editable columns with new values
        this.columns.forEach(column => {
            if (column.editable && !column.isAction && !column.isCheckBox) {
                const selectedValues = this.editRowValues[column.key] || [];
                
                if (selectedValues.length > 0) {
                    if (column.multiSelect !== false) {
                        // For array of objects columns (tests, visits), reconstruct the objects
                        if (column.key === 'tests') {
                            const allTests = this.editOptions[column.key] || [];
                            updatedRow[column.key] = selectedValues.map(id => {
                                const testOption = allTests.find(opt => opt.id === id);
                                return {
                                    studyTestId: id,
                                    testName: testOption?.text || '',
                                    versionNumber: 1 // Default version
                                };
                            });
                        } else if (column.key === 'visits') {
                            const allVisits = this.editOptions[column.key] || [];
                            updatedRow[column.key] = selectedValues.map(id => {
                                const visitOption = allVisits.find(opt => opt.id === id);
                                return {
                                    visitId: id,
                                    visitName: visitOption?.text || '',
                                    versionNumber: 1 // Default version
                                };
                            });
                        } else {
                            // For simple arrays
                            updatedRow[column.key] = [...selectedValues];
                        }
                    } else {
                        // Single select - take first value
                        updatedRow[column.key] = selectedValues[0];
                    }
                }
            }
        });

        this.data[index] = updatedRow;
        this.rowUpdated.emit({ index, row: updatedRow });

        this.editRowIndex = null;
        this.editRowValues = {};
    }
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

    private getFirstValue(key: string, fallback: string): string {
        const value = this.editRowValues[key];
        if (!value || value.length === 0) {
            return fallback ?? '-';
        }
        return value[0];
    }
}