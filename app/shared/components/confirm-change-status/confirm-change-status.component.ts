import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-confirm-change-status',
    templateUrl: './confirm-change-status.component.html',
    styleUrls: ['./confirm-change-status. component. scss']
})
export class ConfirmChangeStatusComponent {
    @Output() action: EventEmitter<number> = new EventEmitter<number>();
    @Input() isEnabled: any;

    onClickModal(status: number) {
        this.action.emit(status);

    }
}