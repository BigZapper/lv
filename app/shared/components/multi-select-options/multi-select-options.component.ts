import { Component, EventEmitter, forwardRef, HostListener, Input, OnInit, Output, ElementRef, ViewChild, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
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
    @Input() placeholder: string = 'Protocol';
    @Input() skeletonCount: number = 5;
    @Input() options: SelectionOption[] = [];
    @Input() multiSelect: boolean = true; // true = multi-select (default), false = single-select
    @Input() displayAsText: boolean = false; // true = show as semicolon-separated text, false = show as chips
    @Input() isVirtualScroll: boolean = false;
    @Input() itemSize: number = 40;
    @Input() loadMoreThreshold: number = 10;
    @Input() isLoading: boolean = false;
    @Input() allOptionsText: string = 'All Protocols';
    @Input() maxItems: number = 12000; // Maximum items to load
    @Output() optionsChange = new EventEmitter<SelectionOption[]>();
    @Output() selectionChange = new EventEmitter<SelectionOption>(); // For single select mode
    @Output() loadMore = new EventEmitter<void>();
    @Output() searchQuery = new EventEmitter<string>();
    @Output() onToggleDropdown = new EventEmitter<boolean>();
    @ViewChild('dropdownWrapper', { static: false }) dropdownWrapper !: ElementRef<HTMLDivElement>;
    @ViewChild('dropdownMenu', { static: false }) dropdownMenu !: ElementRef<HTMLDivElement>;
    @ViewChild(CdkVirtualScrollViewport, { static: false }) virtualScrollViewport !: CdkVirtualScrollViewport;

    showDropdown: boolean = false;
    searchText: string = '';
    selectedOptions: SelectionOption[] = [];
    tempSelectedOptions: SelectionOption[] = [];
    filteredOptions: SelectionOption[] = [];
    allOptionsSelected: boolean = false;
    showMore: boolean = true;

    private isLoadingMore: boolean = false;
    private scrollCheckInterval: any = null;
    private onChange: (value: string[]) => void = () => { };
    private onTouched: () => void = () => { };

    constructor(private elementRef: ElementRef) { }
    ngOnInit(): void {
        this.updateFilteredOptions();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['options']) {
            const previousOptions = changes['options'].previousValue || [];
            const currentOptions = changes['options'].currentValue || [];

            // Auto-select new items if "All Options" is selected
            if (this.allOptionsSelected && currentOptions.length > previousOptions.length) {
                const newItems = currentOptions.filter((curr: SelectionOption) =>
                    !previousOptions.some((prev: SelectionOption) => prev.id === curr.id)
                );

                newItems.forEach((item: SelectionOption) => {
                    if (!this.tempSelectedOptions.some(p => p.id === item.id)) {
                        this.tempSelectedOptions = [... this.tempSelectedOptions, item];
                    }
                });
            }
            this.updateFilteredOptions();

            // Check if all items loaded - stop interval to free resources
            if (currentOptions.length >= this.maxItems) {
                this.stopScrollCheckInterval();
            } else {
                // Force scroll check after data loaded
                setTimeout(() => this.checkScrollPosition(), 100);
            }
        }
    }
    ngOnDestroy(): void {
        this.stopScrollCheckInterval();
    }


    writeValue(value: string[]): void {
        if (value && value.length > 0) {
            this.selectedOptions = this.options.filter(p => value.includes(p.id));
            this.tempSelectedOptions
                = [... this.selectedOptions];
        } else {
            this.selectedOptions = [];
            this.tempSelectedOptions = [];
        }
    }

    registerOnChange(fn: (value: string[]) => void): void {
        this.onChange = fn;
    }
    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }
    toggleDropdown(event: Event): void {
        this.showDropdown = !this.showDropdown;
        if (this.showDropdown) {
            this.onToggleDropdown.emit(true);
            this.tempSelectedOptions = [... this.selectedOptions];
            this.searchText = '';
            this.updateFilteredOptions();
            setTimeout(() => this.scrollIntoViewIfNeeded(), 0);

            // Start interval only if not all items loaded
            if (this.options.length < this.maxItems) {
                this.startScrollCheckInterval();
            }
        } else {
            this.onToggleDropdown.emit(false);
            this.stopScrollCheckInterval();
        }
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
            this.searchQuery.emit(this.searchText);
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
    removeOption(option: SelectionOption, event: Event): void {
        event.stopPropagation();

        // If removing "All Protocols" chip, deselect all
        if (option.id === 'all' && this.allOptionsSelected) {
            this.selectedOptions = [];
            this.tempSelectedOptions = [];
            this.allOptionsSelected = false;
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
        this.selectedOptions = [... this.tempSelectedOptions];
        this.emitChange();
        this.closeDropdown();
    }

    onCancel(): void {
        this.tempSelectedOptions = [... this.selectedOptions];
        this.closeDropdown();

    }

    closeDropdown(): void {
        this.showDropdown = false;
        this.searchText = '';
        this.updateFilteredOptions();
        this.stopScrollCheckInterval();

    }

    get visibleChips(): SelectionOption[] {
        // If all options are selected, show only "All Protocols" chip
        if (this.allOptionsSelected && this.selectedOptions.length > 0) {
            return [{ id: 'all', text: this.allOptionsText, selected: true }];
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