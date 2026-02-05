import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-accordion',
    templateUrl: './accordion.component.html',
    styleUrls: ['./accordion.component.scss']
})

export class AccordionComponent {
    @Input() id = '';
    @Input() expandIcon = '';
    @Input() background = '#fff';
    @Input() ariaExpanded = false;
    @Input() borderBottom = "1px solid #C6C6C6";
    @Input() iris = false;

    @Output() collapseEvent = new EventEmitter<void>();

    clickAction(event: any) { }

    clickCollapse(): void {
        this.collapseEvent.emit();
    }
    ngOnInit() {
    }
}
