import { Component, EventEmitter, forwardRef, HostListener, Input, OnInit, Output, ElementRef, ViewChild, OnChanges, NgZone SimpleChanges, OnDestroy, ChangeDetectorRef, FormBuilder, } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

export interface SelectionOption {
    id: string;
    text: string;
    selected?: boolean;
}

@Component({
    selector: 'app-multi-selection',
    templateUrl: './multi-select-options.component.html',
    styleUrls: ['./multi-select-options. component. scss'],
    styles: [`
        .validation-error-message {
            padding: 8px 12px;
            margin: 8px 0;
            border-radius: 4px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 500;
        }

        .validation-error-error {
            background-color: #ffebee;
            border: 1px solid #ef5350;
        }

        .validation-error-error .error-text {
            color: #c62828;
        }

        .validation-error-warning {
            background-color: #fff3e0;
            border: 1px solid #ffa726;
        }

        .validation-error-warning .error-text {
            color: #e65100;
        }

        .validation-error-info {
            background-color: #e3f2fd;
            border: 1px solid #42a5f5;
        }

        .validation-error-info .error-text {
            color: #1565c0;
        }
    `],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => MultiSelectOptionsComponent),
            multi: true
        }]
})

export class MultiSelectOptionsComponent implements ControlValueAccessor, OnInit, OnChanges, OnDestroy {
    @Input() label: string = 'Protocol';
    @Input() isRequired: boolean = true;
    @Input() isStorageBlindServie = false;
    @Input() hasError: boolean = false;
    @Input() placeholder: string = 'Protocol';
    @Input() allOptionsText: string = 'All Protocols';
    @Input() itemSizePx: number = 40;
    @Input() skeletonCount: number = 5;
    @Input() options: SelectionOption[] = [];
    @Input() multiSelect: boolean = true; // true = multi-select (default), false = single-select
    @Input() displayAsText: boolean = false; // true = show as semicolon-separated text, false = show as chips
    @Input() isVirtualScroll: boolean = false;
    @Input() itemSize: number = 40;
    @Input() searchValue: string = '';
    @Input() totalItems: number = 0;
    @Input() totalInitItems: number = 0;
    @Input() disabled: boolean = false;
    @Input() checkPosition: 'left' | 'right' = 'left';
    @Input() showBorder: boolean = true;
    @Input() isMinusCheckBox: boolean = false;
    @Input() zIndex: number = 1000;
    @Input() showMoreChip: boolean = true;
    @Input() totalCount: number = 0;
    @Input() value: any = null;
    @Input() displayOnlyEmpty: boolean = false;
    @Input() initSelections: any[] = [];
    @Input() loadMoreThreshold: number = 10;
    @Input() isLoading: boolean = false;
    @Input() maxItems: number = 12000; // Maximum items to load
    @Input() validationErrorMessage: string = ''; // Error message for validation
    @Input() validationErrorType: 'error' | 'warning' | 'info' = 'error'; // Type of validation error

    @Output() optionsChange = new EventEmitter<SelectionOption[]>();
    @Output() onAllOptionChange = new EventEmitter<boolean>();
    @Output() selectionChange = new EventEmitter<SelectionOption>(); // For single select mode
    @Output() loadMore = new EventEmitter<void>();
    @Output() searchQuery = new EventEmitter<string>();
    @Output() onToggleDropdown = new EventEmitter<boolean>();
    @Output() dropdownClosed = new EventEmitter<void>();
    @ViewChild('dropdownWrapper', { static: false }) dropdownWrapper!: ElementRef<HTMLDivElement>;
    @ViewChild('dropdownMenu', { static: false }) dropdownMenu!: ElementRef<HTMLDivElement>;
    @ViewChild('inputWrapperRef', { static: false }) inputWrapperRef!: ElementRef<HTMLDivElement>;
    @ViewChild('measureContainer', { static: false }) measureContainer!: ElementRef<HTMLDivElement>;
    @ViewChild(CdkVirtualScrollViewport, { static: false }) virtualScrollViewport!: CdkVirtualScrollViewport;

    constructor(private elementRef: ElementRef, private ngZone: NgZone, private cdr: ChangeDetectorRef, private fb: FormBuilder, private debounceService: DebounceService) { }

    showDropdown: boolean = false;
    searchControl = this.fb.control("");
    searchText: string = "";
    // searchControl this.fb.control("");
    @Input() selectedOptions: SelectionOption[];
    @Input() isEditUser = false;
    @Input() tempSelectedOptions: SelectionOption[] = [];
    filteredOptions: SelectionOption[] = [];
    allOptionsSelected: boolean = false;
    tempAllOptionsSelected: boolean = false;
    showMore: boolean = false;
    private initialValue: any = null; // Track initial value before options load
    // True only when no initial data exists (e.g., no study type selected)
    get hasNoOptions(): boolean {
        return this.totalItems === 0 && this.options.length === 0 && this.isLoading;
    }
    // True when search has no results but initial data exists
    get hasNoSearchResults(): boolean {
        return this.options.length === 0 && !this.isLoading;
    }
    private isLoadingMore: boolean = false;
    private scrollCheckInterval: any = null;
    private onChange: (value: string[]) => void = () => { };
    private onTouched: () => void = () => { };
    // Dynamic chip width calculation
    calculatedMaxChips: number = Infinity;
    private resizeObserver: ResizeObserver | null = null;
    private recalcScheduled: boolean = false;

    ngOnInit(): void {
        // Store initial value for later reference
        this.initialValue = this.value;
        // Handle default value="All" before data loads
        if (this.value === 'All') {
            this.allOptionsSelected = true;
            this.tempAllOptionsSelected = true;
        }
        this.updateFilteredOptions();
        // this.searchControl.valueChanges.pipe(
        // skip(1),
        // debounceTime (300),
        // distinctUntilChanged(),
        // ).subscribe(value => {
        // if (value == null || value == undefined) return;
        // this.onSearchChange (value);
        // });
    }
    ngAfterViewInit(): void {
        // Observe container resize to recalculate visible chips
        if (this.showMoreChip && this.inputWrapperRef?.nativeElement) {
            this.ngZone.runOutsideAngular(() => {
                this.resizeObserver = new ResizeObserver(() => {
                    this.scheduleChipRecalculation();
                });
                this.resizeObserver.observe(this.inputWrapperRef.nativeElement);
            });
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.initSelections.currentValue) {
            this.writeValue(changes.initSelections.currentValue);
        }
        if (changes['options']) {
            const previousOptions = changes['options'].previousValue || [];
            const currentOptions = changes['options'].currentValue || [];
            if (changes['totalItems']?.currentValue !== changes['totalItems']?.previousValue) {
                this.tempAllOptionsSelected = false;
                this.allOptionsSelected = false;
            }

            // If Initial value is 'All' and this is the first data load, select all options
            if (this.initialValue === 'All' && previousOptions.length && currentOptions.length > 0 && this.totalInitItems === this.totalItems) {
                this.selectedOptions = [...currentOptions];
                this.tempSelectedOptions = [...currentOptions];
                this.allOptionsSelected = true;
                this.tempAllOptionsSelected = true;
                this.emitChange();
            } // If initial value is array of IDs, restore selection from those IDs
            else if (Array.isArray(this.initialValue) && this.initialValue.length > 0 && previousOptions.length == 0 && currentOptions.length > 0) {
                this.selectedOptions = currentOptions.filter((opt: SelectionOption) => this.initialValue.includes(opt.id));
                this.tempSelectedOptions = [...this.selectedOptions];
                this.emitChange();
            }
            // If initial value is single ID string, restore that selection
            else if (typeof this.initialValue === 'string' && this.initialValue !== 'All' && this.initialValue.length > 0 && previousOptions.length == 0 && currentOptions.length > 0) {
                const option = currentOptions.find((opt: SelectionOption) => opt.id === this.initialValue);
                if (option) {
                    this.selectedOptions = [option];
                    this.tempSelectedOptions = [option];
                    this.emitChange();
                }
            }

            // Auto-select new items if "All Options" is selected
            else if (this.tempAllOptionsSelected && currentOptions.length > previousOptions.length) {
                const newItems = currentOptions.filter((curr: SelectionOption) =>
                    !previousOptions.some((prev: SelectionOption) => prev.id === curr.id)
                );
                if (this.totalInitItems === this.totalItems) {
                    newItems.forEach((item: SelectionOption) => {
                        if (!this.tempSelectedOptions.some(p => p.id === item.id)) {
                            this.tempSelectedOptions = [...this.tempSelectedOptions, item];
                        }
                        if (!this.selectedOptions.some(p => p.id === item.id)) {
                            this.selectedOptions = [...this.selectedOptions, item];
                        }
                    });
                }
            } else {
                if (this.totalInitItems === this.totalItems && this.tempAllOptionsSelected) {
                    const newItems = currentOptions.filter((curr: SelectionOption) =>
                        !previousOptions.some((prev: SelectionOption) => prev.id === curr.id)
                    );
                    newItems.forEach((item: SelectionOption) => {
                        if (!this.tempSelectedOptions.some(p => p.id === item.id)) {
                            this.tempSelectedOptions = [...this.tempSelectedOptions, item];
                        }
                    });
                }
            }
            this.updateFilteredOptions();
            this.scheduleChipRecalculation();

            // Check if all items loaded - stop interval to free resources
            if (currentOptions.length >= this.maxItems) {
                this.stopScrollCheckInterval();
            } else {
                // Force scroll check after data loaded
                setTimeout(() => this.checkScrollPosition(), 100);
            }
        }
        // for edit user
        if (changes.selectedOptions && this.isEditUser) {
            if (this.selectedOptions) {
                this.selectedOptions.forEach((item: SelectionOption) => {
                    this.toggleOption(item);
                })
                this.onApply();
            }
        }
    }

    ngOnDestroy(): void {
        this.stopScrollCheckInterval();
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }


    writeValue(value: string[] | string | null): void {
        // Store initial value
        if (this.isEditUser) {
            this.writeValueEdit(value);
            return;
        }
        this.initialValue = value;
        // Handle special case where value is 'All'
        if (value === 'All') {
            this.allOptionsSelected = true;
            this.tempAllOptionsSelected = true;
            // When data loads, select all options
            if (this.options.length > 0) {
                this.selectedOptions = [...this.options];
                this.tempSelectedOptions = [...this.options];
            } else {
                this.selectedOptions = [];
                this.tempSelectedOptions = [];
            }
        }
        // Handle empty/null value no selection
        else if (!value || (Array.isArray(value) && value.length === 0)) {
            this.selectedOptions = [];
            this.tempSelectedOptions = [];
            this.allOptionsSelected = false;
            this.tempAllOptionsSelected = false;
        }

        // Handle single ID string single selection
        else if (typeof value === 'string' && value !== 'All') {
            const option = this.options.find(p => p.id === value);
            if (option) {
                this.selectedOptions = [option];
                this.tempSelectedOptions = [option];
            } else {
                this.selectedOptions = this.isEditUser ? this.selectedOptions : [];
                this.tempSelectedOptions = [];
            }
            this.allOptionsSelected = false;
            this.tempAllOptionsSelected = false;
        }
        // Handle array of IDs multiple selection
        else if (Array.isArray(value) && value.length > 0) {
            this.selectedOptions = this.options.filter(p => value.includes(p.id));
            this.tempSelectedOptions = [...this.selectedOptions];
            this.allOptionsSelected = false;
            this.tempAllOptionsSelected = false;
        }
        this.updateFilteredOptions();
        this.updateConfirmedAllOptionsState(); // Update allOptionsSelected state
        this.scheduleChipRecalculation();
    }

    writeValueEdit(value: any): void {
        if (value && value.length > 0) {
            this.selectedOptions = this.options.filter(p => value.includes(p.id));
            this.tempSelectedOptions = [...this.selectedOptions];
        }
        else {
            this.selectedOptions = this.isEditUser ? this.selectedOptions : [];
            this.tempSelectedOptions = [];
        }
        this.updateFilteredOptions();
        this.updateConfirmedAllOptionsState(); // Update allOptionsSelected state after setting values
    }

    registerOnChange(fn: (value: string[]) => void): void {
        this.onChange = fn;
    }
    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }
    toggleDropdown(event: Event): void {
        if (this.disabled) {
            return; // Don't open dropdown if disabled
        }
        this.showDropdown = !this.showDropdown;
        if (this.showDropdown) {
            this.onToggleDropdown.emit(true);
            this.tempSelectedOptions = [...this.selectedOptions];
            // this.searchControl.setValue(this.searchValue || ", ( emitEvent: false });
            if (!this.isStorageBlindServie) this.searchText = this.searchValue || '';
            this.tempAllOptionsSelected = this.allOptionsSelected;
            this.updateFilteredOptions();
            setTimeout(() => this.scrollIntoViewIfNeeded(), 0);
            // Start interval only if not all items loaded
            if (this.options.length < this.maxItems) {
                this.startScrollCheckInterval();
            }
        } else {
            this.onToggleDropdown.emit(false);
            this.stopScrollCheckInterval();
            this.dropdownClosed.emit();
            this.onTouched();
        }
    }

    get isIndeterminate(): boolean {
        return this.tempSelectedOptions.length > 0 && this.tempSelectedOptions.length < this.filteredOptions.length;
    }

    private startScrollCheckInterval(): void {
        this.stopScrollCheckInterval();
        this.scrollCheckInterval = setInterval(() => {
            this.checkScrollPosition();
        }, 500);
    }
    private stopScrollCheckInterval(): void {
        if (this.scrollCheckInterval) {
            clearInterval(this.scrollCheckInterval);
            this.scrollCheckInterval = null;
        }
    }

    onSearchChange(): void {
        if (this.isVirtualScroll) {
            const onSearch = () => {
                this.searchQuery.emit(this.searchText);
            }
            this.debounceService.debounce(onSearch, 600);
        } else {
            this.updateFilteredOptions();
        }
    }
    updateFilteredOptions(): void {
        if (this.isVirtualScroll) {
            this.filteredOptions = [... this.options];
        } else {
            const searchLower = this.searchText.toLowerCase().trim();
            if (searchLower) {
                this.filteredOptions = this.options.filter(p =>
                    p.text.toLowerCase().includes(searchLower) ||
                    p.id.toLowerCase().includes(searchLower)
                );
            } else {
                this.filteredOptions = [... this.options];
            }
        }
        this.updateAllOptionsCheckbox();
    }
    toggleOption(option: SelectionOption): void {
        if (!this.multiSelect) {
            // Single select mode: close immediately and emit
            this.selectedOptions = [option];
            this.tempSelectedOptions = [option];
            this.emitChange();
            this.selectionChange.emit(option);
            this.closeDropdown();
            return;
        }
        // Multi-select mode: toggle selection
        const index = this.tempSelectedOptions.findIndex(p => p.id === option.id);
        if (index > -1) {
            this.tempSelectedOptions.splice(index, 1);
        } else {
            this.tempSelectedOptions.push(option);
        }
        this.updateAllOptionsCheckbox();
    }

    isOptionSelected(option: SelectionOption): boolean {
        return this.tempSelectedOptions.some(p => p.id === option.id);
    }
    toggleAllOptions(): void {
        if (this.allOptionsSelected) {
            this.tempSelectedOptions = [];
            this.allOptionsSelected = false;
        } else {
            this.tempSelectedOptions = [... this.filteredOptions];
            this.allOptionsSelected = true;
        }
    }
    updateAllOptionsCheckbox(): void {
        if (this.filteredOptions.length === 0) {
            this.allOptionsSelected = false;
            return;
        }
        this.allOptionsSelected = this.filteredOptions.every(fp =>
            this.tempSelectedOptions.some(p => p.id === fp.id)
        )
    }

    updateConfirmedAllOptionsState(): void {
        // For components with totalItems (pagination), check against totalItems
        if (this.totalItems > 0) {
            this.allOptionsSelected = this.selectedOptions.length === this.totalItems;
            return;
        }
        // For components without totalItems (static options), check against all options
        if (this.options.length === 0) {
            this.allOptionsSelected = false;
            return;
        }
        this.allOptionsSelected = this.options.every(option =>
            this.selectedOptions.some(selected => selected.id === option.id)
        );
    }

    removeOption(option: SelectionOption, event: Event): void {
        event.stopPropagation();

        // If removing "All" chip, deselect all and reset initial value
        if ((option.id === 'all' || this.allOptionsSelected) && this.totalInitItems === this.totalItems) {
            this.selectedOptions = [];
            this.tempSelectedOptions = [];
            this.allOptionsSelected = false;
            this.tempAllOptionsSelected = false;
            this.initialValue = null; // Reset so visibleChips won't show "All" chip
            this.value = null; // Reset input value
            this.emitChange();
            return;
        }
        const index = this.selectedOptions.findIndex(p => p.id === option.id);
        if (index > -1) {
            this.selectedOptions.splice(index, 1);
            const tempIndex = this.tempSelectedOptions.findIndex(p => p.id === option.id);
            if (tempIndex > -1) {
                this.tempSelectedOptions.splice(tempIndex, 1);
            }
            this.emitChange();
            this.updateAllOptionsCheckbox();
        }
    }

    onApply(): void {
        this.selectedOptions = [...this.tempSelectedOptions];
        this.allOptionsSelected = this.tempAllOptionsSelected;
        // Reset initialValue and value when not all options are selected (to prevent "All" chip from persisting)
        if (!this.tempAllOptionsSelected) {
            this.initialValue = null;
            this.value = null;
        }
        this.emitChange();
        this.closeDropdown();
    }

    onCancel(): void {
        this.tempSelectedOptions = [... this.selectedOptions];
        this.tempAllOptionsSelected = this.allOptionsSelected;
        this.closeDropdown();

    }

    closeDropdown(): void {
        this.showDropdown = false;
        this.searchText = '';
        this.updateFilteredOptions();
        this.stopScrollCheckInterval();
        this.dropdownClosed.emit();
        this.onTouched();

    }

    get visibleChips(): SelectionOption[] {
        // Show "All" chip if initialValue="All' or value='All' (even before data loads)
        if (this.initialValue === 'All' || this.value === 'All' && this.totalInitItems === this.totalItems) {
            return [{ id: 'all', text: this.allOptionsText, selected: true }];
        }
        // Show "All" chip when allOptionsSelected is true (user clicked All checkbox and Apply)
        if (this.allOptionsSelected && this.selectedOptions.length > 0 && this.totalInitItems === this.totalItems) {
            return [{ id: 'all', text: this.allOptionsText, selected: true }];
        }
        if (this.showMoreChip && this.selectedOptions.length > this.calculatedMaxChips) {
            return this.selectedOptions.slice(0, this.calculatedMaxChips);
        }
        return this.selectedOptions;
    }

    get hasMoreChips(): boolean {
        // Don't show "+N" when showing "All Protocols"
        if (this.allOptionsSelected) {
            return false;
        }
        return this.selectedOptions.length > 3;

    }

    get hiddenChipsCount(): number {
        if (!this.hasMoreChips) {
            return 0;
        }
        return this.selectedOptions.length - this.calculatedMaxChips;

    }

    get selectedOptionsText(): string {
        if (this.allOptionsSelected && this.selectedOptions.length > 0) {
            return this.allOptionsText;
        }
        return this.selectedOptions.map(opt => opt.text).join('; ');
    }

    get displayOptionsWithSkeleton(): (SelectionOption | { isSkeleton: boolean })[] {
        const items: (SelectionOption | { isSkeleton: boolean })[] = [... this.filteredOptions];

        if (this.isLoading && this.skeletonCount > 0) {
            for (let i = 0; i < this.skeletonCount; i++) {
                items.push({ isSkeleton: true });
            }
        }
        return items;
    }
    isSkeleton(item: any): boolean {
        return item && item.isSkeleton === true;
    }
    toggleShowMore(event: Event): void {
        event.stopPropagation();
        this.showMore = !this.showMore;
    }

    private emitChange(): void {
        const value = this.selectedOptions.map(p => p.id);
        this.onChange(value);
        this.optionsChange.emit(this.selectedOptions);
        if (this.multiSelect) {
            if (
                (
                    this.initialValue === 'All' ||
                    this.value === 'All' ||
                    this.allOptionsSelected
                ) &&
                this.selectedOptions.length > 0 &&
                this.totalInitItems === this.totalItems
            ) {
                this.onAllOptionChange.emit(true);
            } else {
                this.onAllOptionChange.emit(false);
            }
        }
        this.scheduleChipRecalculation();
    }

    /** Schedule a recalculation of how many chips fit in the container */
    scheduleChipRecalculation(): void {
        if (!this.showMoreChip || this.recalcScheduled) return;
        this.recalcScheduled = true;
        // Wait for DOM to render all chips before measuring
        setTimeout(() => {
            this.recalcScheduled = false;
            this.measureAndCalculateMaxChips();
        }, 0);
    }
    /** Measure chips in hidden container and calculate how many fit in the visible area */
    private measureAndCalculateMaxChips(): void {
        if (!this.showMoreChip) return;
        const wrapperEl = this.inputWrapperRef?.nativeElement;
        const measureEl = this.measureContainer?.nativeElement;
        if (!wrapperEl || !measureEl) return;
        // If showing "All" chip or no selections, no need to calculate
        if (this.allOptionsSelected || this.initialValue === 'All' || this.value === 'All' || this.selectedOptions.length === 0) {
            this.calculatedMaxChips = Infinity;
            return;
        }
        const wrapperwidth = wrapperEl.clientWidth;
        // Get the actions area width ("N. more" text + dropdown icon)
        const actionsEl = wrapperEl.querySelector('.input-actions');
        const actionsWidth = actionsEl ? (actionsEl as HTMLElement).offsetWidth : 50;
        // Container padding (left 16px + right 16px) + gap between chips area and actions (8px)
        const containerPadding = 40;
        const availableWidth = wrapperwidth - actionsWidth - containerPadding;
        // Measure each chip from the hidden measurement container
        const chipEls = measureEl.querySelectorAll('.measure-chip');
        if (chipEls.length === 0) {
            this.calculatedMaxChips = Infinity;
            return;
        }
        let usedWidth = 0;
        let fitCount = 0;
        const chipGap = 4; // gap between chips
        for (let i = 0; i < chipEls.length; i++) {
            const chipWidth = (chipEls[i] as HTMLElement).offsetWidth;
            const totalChipWidth = chipWidth + (i > 0 ? chipGap : 0);
            if (usedWidth + totalChipWidth <= availableWidth) {
                usedWidth += totalChipWidth;
                fitCount++;
            } else {
                break;
            }
        }
        const newMax = Math.max(1, fitCount);
        if (newMax !== this.calculatedMaxChips) {
            this.calculatedMaxChips = newMax;
            this.cdr.detectChanges();
        }
    }
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        setTimeout(() => {
            const target = event.target as HTMLElement;
            const clickedInside = this.elementRef.nativeElement.contains(target);
            if (!clickedInside && this.showDropdown) {
                this.closeDropdown();
            }
        }, 0);
    }

    private scrollIntoViewIfNeeded(): void {
        if (!this.dropdownMenu) return;

        const dropdownElement = this.dropdownMenu.nativeElement;
        const dropdownRect = dropdownElement.getBoundingClientRect();
        const scrollableParent = this.findScrollableParent(this.elementRef.nativeElement);

        if (!scrollableParent) {
            const viewportHeight = window.innerHeight;
            const dropdownBottom = dropdownRect.bottom;

            if (dropdownBottom > viewportHeight) {
                const scrollAmount = dropdownBottom - viewportHeight + 20;
                window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
            }
        } else {
            const parentRect = scrollableParent.getBoundingClientRect();
            const dropdownBottom = dropdownRect.bottom;
            const parentBottom = parentRect.bottom;

            if (dropdownBottom > parentBottom) {
                const overflowAmount = dropdownBottom - parentBottom;
                const maxScrollTop = scrollableParent.scrollHeight - scrollableParent.clientHeight;
                const currentScrollTop = scrollableParent.scrollTop;
                const availableScroll = maxScrollTop - currentScrollTop;
                const scrollAmount = Math.min(overflowAmount + 20, availableScroll);

                if (scrollAmount > 0) {
                    scrollableParent.scrollBy({ top: scrollAmount, behavior: 'smooth' });
                }
            }
        }
    }

    private findScrollableParent(element: HTMLElement): HTMLElement | null {
        let parent = element.parentElement;

        while (parent) {
            const overflowY = window.getComputedStyle(parent).overflowY;
            const isScrollable = overflowY === 'auto' || overflowY === 'scroll';

            if (isScrollable && parent.scrollHeight > parent.clientHeight) {
                return parent;

            }

            parent = parent.parentElement;
        }
        return null;
    }
    onScroll(): void {
        this.checkScrollPosition();
    }
    private checkScrollPosition(): void {
        // Skip if not virtual scroll, already loading, or all items loaded
        if (!this.isVirtualScroll || !this.virtualScrollViewport || this.isLoadingMore || this.isLoading) {
            return;
        }
        // Stop interval if all items loaded
        if (this.options.length >= this.maxItems) {
            this.stopScrollCheckInterval();
            return;
        }

        const viewportElement = this.virtualScrollViewport.elementRef.nativeElement;
        const scrollTop = viewportElement.scrollTop;
        const scrollHeight = viewportElement.scrollHeight;
        const clientHeight = viewportElement.clientHeight;

        const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
        const pixelThreshold = 50;

        if (distanceFromBottom <= pixelThreshold) {
            this.isLoadingMore = true;
            this.loadMore.emit();
        }
        setTimeout(() => {
            this.isLoadingMore = false;
        }, 1500);
    }
}