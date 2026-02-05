import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SortEvent, TableColumn } from '@app/shared/components/reusable-table/reusable-table.component';
import { TestMasterService } from '@app/shared/services/test-master. service';
import { getIsDesktop } from '@app/store/dialog/dialog.selectors';
import { Store } from '@ngrx/store';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';

interface Location {
    locationName: string
    status: string
    testingFrequency: string
    comment: string
    timeUnit: string
    turnAroundTime: number
}
interface GeneralDetail {
    testName: string,
    testCode: string,
    testAliases: string[],
    workingUnit: string,
    decimalPlaces: number,
    isApprovedForClinicalRep: boolean,
    isResearchUseOnly: boolean,
    solutionIVDRComplaint: boolean
    locations: Location[]
}
@Component({
    selector: 'app-test-master-general',
    templateUrl: './test-master-general.component.html',
    styleUrls: ['./test-master-general.component.scss']
})

export class TestMasterGeneralComponent implements OnInit {
    id !: string
    constructor(private store: Store, private testMasterService: TestMasterService, private route: ActivatedRoute) { }
    private readonly destroy$ = new Subject<void>();
    isDesktop = false;
    // Data
    generalDetail: GeneralDetail = {
        testName: "",
        testCode: "",
        testAliases: [],
        workingUnit: "",
        decimalPlaces: 2,
        isApprovedForClinicalRep: true,
        isResearchUseOnly: false,
        solutionIVDRComplaint: true,
        locations: []
    }

    expandedCardIndexes: Set<number> = new Set();
    showLocationPopup = false;

    // Cache for processed locations
    private _cachedLocations: Location[] = [];
    private _lastRawLocations: Location[] = [];
    
    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            this.id = params.get('id')!;

            this.fetchMasterSearchList(this.id);
        })
        this.store.select(getIsDesktop)
            .pipe(takeUntil(this.destroy$))
            .subscribe(value => {
                this.isDesktop = value;
            });
    }
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
    // Table Columns Configuration
    tableColumns: TableColumn[] = [
        { title: 'Location', key: 'locationName', sortable: true, class: 'text-left' },
        { title: 'Status', key: 'status', sortable: true, class: 'text-left' },
        { title: 'Testing Frequency', key: 'testingFrequency', sortable: true, class: 'text-left' },
        { title: 'Comments', key: 'comment', sortable: true, class: 'text-left' },
        { title: 'Total Turn Around Time', key: 'totalTurnAroundTime', sortable: true, class: 'text-left' },
    ]
    async fetchMasterSearchList(id: string) {
        try {
            if (id) {
                // this.setLoading(true);
                const response = await firstValueFrom(this.testMasterService.getTestmasterDetail(id));
                if (response) {
                    // this.normalizeMasterSearchList(response ?. data);
                    this.generalDetail = response?.data;
                }
            }
            // this.setLoading(false);
            return true
        } catch (error) {
            // this.setLoading(false);
            console.log("error", error);
            return true
        }
    }

    get paginatedResults(): GeneralDetail {
        // Only reprocess if locations actually changed
        if (this.generalDetail.locations !== this._lastRawLocations) {
            this._lastRawLocations = this.generalDetail.locations;
            this._cachedLocations = this.generalDetail.locations
                .filter(location => location.status === 'Active')
                .map(location => ({
                    ...location,
                    testingFrequency: location.testingFrequency?.startsWith('rb')
                        ? location.testingFrequency.substring(2)
                        : location.testingFrequency,
                    totalTurnAroundTime: this.formatTurnAroundTime(location.turnAroundTime, location.timeUnit)
                } as any));
        }
        
        return {
            ...this.generalDetail,
            locations: this._cachedLocations
        };
    }

    formatTurnAroundTime(turnAroundTime: number, timeUnit: string | null): string {
        if (!timeUnit) {
            return '-';
        }
        
        if (turnAroundTime === 1) {
            return `1 ${timeUnit.toLowerCase().replace('s', '')}`;
        }
        
        return `${turnAroundTime} ${timeUnit.toLowerCase()}`;
    }

    private applySort(column: string, direction: 'asc' | 'desc' | 'none'): void {
        if (direction === 'none') {
            return;
        }
        this.generalDetail.locations.sort((a, b) => {
            const aValue = (a as any)[column];
            const bValue = (b as any)[column];

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                const comparison = aValue.localeCompare(bValue);
                return direction === 'asc' ? comparison : -comparison;
            }
            return direction === 'asc' ? aValue - bValue : bValue - aValue;
        });
    }
    onTableSort(event: SortEvent): void {
        this.applySort(event.column, event.direction);
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

    shouldShowExpandButton(comment: string): boolean {
        return comment && comment.length > 120;
    }

    get displayedLocations(): Location[] {
        const filteredLocations = this.paginatedResults.locations;
        if (this.isDesktop) {
            return filteredLocations;
        }
        return filteredLocations.slice(0, 5);
    }

    get remainingLocationsCount(): number {
        return this.paginatedResults.locations.length - 5;
    }

    openLocationPopup(): void {
        this.showLocationPopup = true;
    }

    onModalAction(status: number): void {
        if (status === 0) {
            this.showLocationPopup = false;
        }
    }
}