import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Subject, takeUntil } from 'rxjs';
import { getIsDesktop } from '@app/store/dialog/dialog.selectors';
import { TableColumn, SortEvent } from '@app/shared/components/reusable-table/reusable-table.
import { Router, ActivatedRoute } from '@angular/router';

interface TestMasterItem {
    testName: string;
    testCode: string;
    testAlias: string;
    testType: string;
    reportName: string;
    status: string;
    department: string;
    method: string;
    baseUnit: string;
    assaySensitivity: string;
}
@Component({
    selector: 'app-test-master-search',
    templateUrl: './test-master-search.component.html',
    styleUrls: ['./test-master-search. component.scss']
})

export class TestMasterSearchComponent implements OnInit, OnDestroy {
    private readonly destroy$ = new Subject<void>();

    // UI State
    isDesktop = false;
    showValidationError = false;
    showFilterModal = false;
    showFilter = true;
    hasSearched = false;

    // Form
    searchForm!: FormGroup;
    testName = '';
    testCode = '';

    // Data
    searchResults: TestMasterItem[] = [];
    totalItems = 0;

    // Pagination
    page = 1;
    pageSize = 10;
    // Mobile Cards
    expandedCardIndexes: Set<number> = new Set();
    values = [
        { value: 'Yes', text: 'Yes' },
        { value: 'No', text: 'No' },
    ]

    // Table Columns Configuration
    tableColumns: TableColumn[] = [
        { title: 'Test Name', key: 'testName', sortable: true, class: 'text-left' },
        { title: 'Test Code', key: 'testCode', sortable: true, class: 'text-left' },
        { title: 'Test Alias', key: 'testAlias', sortable: true, class: 'text-left' },
        { title: 'Test Type', key: 'testType', sortable: true, class: 'text-left' },
        { title: 'Report Name', key: 'reportName', sortable: true, class: 'text-left' },
        { title: 'Status', key: 'status', sortable: true, class: 'text-left' },
        { title: 'Department', key: 'department', sortable: true, class: 'text-left' },
        { title: 'Method', key: 'method', sortable: true, class: 'text-left' },
        { title: 'Base Unit', key: 'baseUnit', sortable: true, class: 'text-left' },
        { title: 'Assay Sensitivity', key: 'assaySensitivity', sortable: true, class: 'text-left' },
    ];

    constructor(private store: Store, private router: Router, private route: ActivatedRoute) {
        this.initializeForm();
    }
    // Lifecycle Hooks  
    ngOnInit(): void {
        this.store.select(getIsDesktop)
            .pipe(takeUntil(this.destroy$))
            .subscribe(value => {
                this.isDesktop = value;
                this.pageSize = 10;
            });

        // Load search params from URL
        this.route.queryParams
            .pipe(takeUntil(this.destroy$))
            .subscribe(params => {
                if (params['testName'] || params['testCode']) {
                    this.searchForm.patchValue({
                        testName: params['testName'] || '',
                        testCode: params['testCode'] || ''
                    });
                    this.page = params['page'] ? +params['page'] : 1;
                    this.onSearch();
                }
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
    private initializeForm(): void {
        this.searchForm = new FormGroup({
            testName: new FormControl(''),
            testCode: new FormControl('')
        })
    }

    onSearch(): void {
        if (!this.searchForm.value.testName.trim() && !this.searchForm.value.testCode.trim()) {
            this.showValidationError = true;
            this.hasSearched = false;
            this.searchResults = [];
            return;
        }
        this.showValidationError = false;
        this.hasSearched = true;
        this.page = 1;

        // Update URL with search params
        this.updateUrlParams(true);

        this.generateMockData();
    }



    onClear(): void {
        this.searchForm.reset();
        this.testName = "";
        this.testCode = "";
        this.showValidationError = false;
        this.hasSearched = false;
        this.searchResults = [];
        this.totalItems = 0;
        this.page = 1;

        // Clear URL params
        this.updateUrlParams();
    }

    private updateUrlParams(isSearchAction: boolean = false): void {
        const queryParams: any = {};

        // Only include params if form has values
        if (!isSearchAction) {
            // Clear all params
            this.router.navigate([], {
                relativeTo: this.route,
                queryParams: {}
            });
        } else {
            // Include search params
            Object.keys(this.searchForm.value).forEach((key) => {
                const value = this.searchForm.value[key];
                if (value) {
                    queryParams[key] = value;
                }
            });
            queryParams.page = this.page;

            this.router.navigate([], {
                relativeTo: this.route,
                queryParams,
                queryParamsHandling: 'merge'
            });
        }
    }

    onPrepend(): void {
        // Handle prepend action if needed

    }

    private generateMockData(): void {
        this.totalItems = 120;
        this.searchResults = Array.from({ length: this.totalItems }, (_, i) => {
            const index = i + 1;
            return {
                testName: `Test Name ${index}`,
                testCode: `TC${String(index).padStart(4, '0')}`,
                testAlias: `Alias ${index}`,
                testType: index % 2 === 0 ? 'Quantitative' : 'Qualitative',
                reportName: `Report ${index}`,
                status: index % 3 === 0 ? 'Inactive' : 'Active',
                department: ['Hematology', 'Chemistry', 'Immunology'][index % 3],
                method: index % 2 === 0 ? 'Automated' : 'Manual',
                baseUnit: ['mg/dL', 'mmol/L', 'g/L'][index % 3],
                assaySensitivity: `${(Math.random() * 10).toFixed(2)} ${['mg/dL', 'mmol/L', 'g/L'][index % 3]}`
            };
        });

        // Apply default sort by testName ascending
        this.applySort('testName', 'asc');
    }
    get paginatedResults(): TestMasterItem[] {
        const currentPageSize = this.pageSize;
        const start = (this.page - 1) * currentPageSize;
        const end = start + currentPageSize;
        return this.searchResults.slice(start, end);
    }
    onActionPage(action: number): void {
        if (action === 1) {
            this.page++;
        } else {
            this.page--;
        }

        // Update URL with new page number
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { page: this.page },
            queryParamsHandling: 'merge'
        });
    }

    toggleFilterModal(): void {
        this.showFilter = !this.showFilter;
        this.showFilterModal = !this.showFilterModal;
    }
    onApplyFilters(): void {
        this.page = 1;
        this.showFilterModal = false;
    }
    onClearFilters(): void {
        this.showFilterModal = false;
    }
    onTableSort(event: SortEvent): void {
        this.applySort(event.column, event.direction);
    }
    private applySort(column: string, direction: 'asc' | 'desc' | 'none'): void {
        if (direction === 'none') {
            return;
        }
        this.searchResults.sort((a, b) => {
            const aValue = (a as any)[column];
            const bValue = (b as any)[column];
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                const comparison = aValue.localeCompare(bValue);
                return direction === 'asc' ? comparison : -comparison;
            }
            return direction === 'asc' ? aValue - bValue : bValue - aValue;
        });
    }
    navigateToTestDetails() {
        this.router.navigate(['/test-master/test-master-detail']);

    }

    toggleCardExpand(index: number): void {
        if (this.expandedCardIndexes.has(index)) {
            this.expandedCardIndexes.delete(index);
        } else {
            this.expandedCardIndexes.add(index);

        }
    }

    isCardExpanded(index: number): boolean {
        return this.expandedCardIndexes.has(index);
    }
}