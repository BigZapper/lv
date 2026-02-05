import { Component, EventEmitter, Input, Output } from '@angular/core';

interface Location {
    locationName: string;
    status: string;
    testingFrequency: string;
    comment: string;
    timeUnit: string;
    turnAroundTime: number;
}

@Component({
    selector: 'app-location-popup',
    templateUrl: './location-popup.component.html',
    styleUrls: ['./location-popup.component.scss']
})
export class LocationPopupComponent {
    @Input() locations: Location[] = [];
    @Output() close: EventEmitter<void> = new EventEmitter<void>();

    expandedCardIndexes: Set<number> = new Set();

    onClickModal(status: number) {
        if (status === 0) {
            this.close.emit();
        }
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
