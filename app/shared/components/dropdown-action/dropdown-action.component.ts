import { Component, EventEmitter, Input, Output, HostListener } from '@angular/core';

export interface DropdownActionItem {
    text: string;
    selected?: boolean;
    icon?: any;
    value?: any;
    childrens?: DropdownActionItem[];
}

@Component({
    selector: 'app-dropdown-action',
    templateUrl: './dropdown-action. component.html',
    styleUrls: ['./dropdown-action.component.scss']
})
export class DropdownActionComponent {
    @Input() items: DropdownActionItem[] = [];
    @Input() show = false;
    @Input() width = '216px';
    @Input() position: 'left' | 'right' = 'right';
    @Input() preventAutoClose = false; // Prevent auto-close when clicking outside
    @Output() itemClick = new EventEmitter<DropdownActionItem>();
    @Output() showChange = new EventEmitter<boolean>();

    hoveredItem: DropdownActionItem | null = null;
    hoveredChildItem: DropdownActionItem | null = null;

    onItemClick(item: DropdownActionItem, event: Event): void {
        event.stopPropagation();
        // Only emit if item doesn't have children
        if (!item.childrens || item.childrens.length === 0) {
            this.itemClick.emit(item);
        }
    }

    onItemHover(item: DropdownActionItem | null): void {
        this.hoveredItem = item;
    }

    onChildItemClick(child: DropdownActionItem, event: Event): void {
        event.stopPropagation();
        this.itemClick.emit(child);
    }

    onChildItemHover(child: DropdownActionItem | null): void {
        this.hoveredChildItem = child;
    }
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (this.preventAutoClose) {
            return;
        }
        if (this.show) {
            this.show = false;
            this.showChange.emit(this.show);
        }
    }
}