import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SelectionOption } from '@app/shared/components/multi-select-options/multi-select-options. component';
import { AdminManagementService } from '@app/shared/services';

@Component({
    selector: 'app-copy-user-modal',
    templateUrl: './copy-user-modal.component.html',
    styleUrls: ['./copy-user-modal. component.scss']
})

export class CopyUserModalComponent implements OnInit, OnChanges {
    @Input() show = false;

    @Output() close = new EventEmitter<void>();
    @Output() save = new EventEmitter<any>();

    copyUserForm !: FormGroup;
    // Protocol data
    protocolOptions: SelectionOption[] = [];
    protocolOptionsAll: SelectionOption[] = []; // Store all 5000 protocols
    // Virtual Scroll properties
    isLoadingProtocols = false;
    protocolPageSize = 300;
    currentPage = 1;
    totalProtocols = 0;
    hasMoreProtocols = true;

    private selectedProtocolId: string = '';

    constructor(
        private fb: FormBuilder,
        private adminManagementService: AdminManagementService
    ) { }
    ngOnInit(): void {
        this.initializeForm();
        // this. initializeProtocolData();
        // loadInitialProtocols will be called when modal is shown.
        // If component is mounted and `show` is already true, load now.
        if (this.show) {
            this.resetProtocolState();
            this.loadInitialProtocols();
        }
    }
    
    ngOnChanges(changes: SimpleChanges): void {
        if (changes.show && changes.show.currentValue) {
            // Modal opened: reset protocol lists and load fresh initial data
            this.resetProtocolState();
            this.loadInitialProtocols();
        }
    }

    private resetProtocolState(): void {
        this.isLoadingProtocols = false;
        this.currentPage = 1;
        this.protocolOptions = [];
        this.protocolOptionsAll = [];
        this.totalProtocols = 0;
        this.hasMoreProtocols = true;
        this.selectedProtocolId = '';
        if (this.copyUserForm) {
            this.copyUserForm.reset();
        }
    }
    private initializeForm(): void {
        this.copyUserForm = this.fb.group({
            protocol: ['']
        });
    }
    onModalAction(action: number): void {
        if (action === 1) {
            this.save.emit(this.copyUserForm.value);
            this.copyUserForm.reset();
        } else {
            this.close.emit();
            this.copyUserForm.reset();
        }
    }
    onProtocolChange(selectedProtocol: SelectionOption): void {
        console.log('Selected protocol (virtual):', selectedProtocol);
        this.selectedProtocolId = selectedProtocol.id
    }
    onProtocolSearch(searchText: string): void {
        console.log('Search protocol (virtual):', searchText);

        // Simulate search with delay
        this.isLoadingProtocols = true;
        setTimeout(() => {
            const searchLower = searchText.toLowerCase().trim();
            if (searchLower) {
                // Filter from all protocols
                this.protocolOptions = this.protocolOptionsAll
                    .filter(p => p.text.toLowerCase().includes(searchLower) || p.id.toLowerCase().includes(searchLower))
                    .slice(0, 100); // Load first 100 results
            } else {
                // Reset to initial batch
                this.loadInitialProtocols();
            }
            this.isLoadingProtocols = false;
        }, 500);
    }

    private loadProtocolsFromAPI(page: number): void {
        const payload = {
            page: page,
            pageSize: this.protocolPageSize,
            protocolId: null
        }
        this.adminManagementService.getActivatedProtocols(payload).subscribe({
            next: (response) => {
                const newOptions: SelectionOption[] = response.items.map((protocol: { protocolId: string; studyCode: any; }) => ({
                    id: protocol.protocolId,
                    text: protocol.studyCode,
                    // Restore selected state for items that were previously selected
                    selected: this.selectedProtocolId === protocol.protocolId
                }));
                this.protocolOptions = [...this.protocolOptions, ...newOptions];
                // protocolOptionsAll should accumulate all fetched items (not be overwritten by filtered view)
                this.protocolOptionsAll = [...this.protocolOptionsAll, ...newOptions];
                this.totalProtocols = response.totalCount;
                this.hasMoreProtocols = this.protocolOptions.length < response.totalCount;
                this.isLoadingProtocols = false;
            },
            error: (error) => {
                console.error('Error loading protocols:', error);
                this.isLoadingProtocols = false;
            }
        });
    }
    // Load initial batch of protocols
    private loadInitialProtocols(): void {
        this.isLoadingProtocols = true;
        this.currentPage = 1;
        this.protocolOptions = [];
        this.loadProtocolsFromAPI(this.currentPage);
    }

    // Load more protocols (pagination)
    onLoadMoreProtocols(): void {
        console.log(this.hasMoreProtocols)
        if (this.isLoadingProtocols || !this.hasMoreProtocols) {
            return;
        }
        this.isLoadingProtocols = true;
        this.currentPage++;
        this.loadProtocolsFromAPI(this.currentPage);
    }
}