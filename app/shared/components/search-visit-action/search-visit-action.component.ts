import { Component, ElementRef, EventEmitter, Input, Output, Renderer2, ViewChild } from '@angular/core';
import { FeatureAccessMap, Roles } from '@app/shared/utils';

interface ActionChild {
    id: string;
    name: string;
    disabled?: boolean;
    access?: string;
}

interface Action {
    id: string;
    name: string;
    disable?: boolean;
    disabled?: boolean;
    childrens?: ActionChild[];
    access?: string;
}

@Component({
    selector: 'app-search-visit-action',
    templateUrl: './search-visit-action. component.html',
    styleUrls: ['./search-visit-action.component. scss']
})

export class SearchVisitActionComponent {
    @Input() actions: Action[] = [];
    @Input() isSearchShipments = false;
    @Input() isViewSampleReceiptHistory = false;
    @Input() isViewOrderKit = false;
    @Input() isAdminProtocol = false;
    @Input() isHighLight = false;
    @Input() id = '';
    @Output() visitAction: EventEmitter<any> = new EventEmitter<any>();
    @Output() onDropdownAction: EventEmitter<any> = new EventEmitter<any>();
    @ViewChild('dropdownButton') dropdownButton !: ElementRef;
    featureAccessMap = FeatureAccessMap;
    roles = Roles;
    constructor(private renderer: Renderer2) { }

    ngAfterViewInit() {
        this.addDropdownEventListeners();

    }

    addDropdownEventListeners() {
        this.renderer.listen(this.dropdownButton.nativeElement, 'show.bs.dropdown', () => {
            this.onDropdownAction.emit('shown')
        });

        this.renderer.listen(this.dropdownButton.nativeElement, 'hide.bs.dropdown', () => {
            this.onDropdownAction.emit('hidden')
        })
    }

    onItemClick(event: Event, action: Action) {
        const isDisabled = action.disabled || action.disable;
        const hasChildren = action.childrens && action.childrens.length > 0;
        
        if (isDisabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        
        if (hasChildren) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        
        this.visitAction.emit({ actionId: action.id });
    }
}