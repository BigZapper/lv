import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-registration-email-modal',
    templateUrl: './registration-email-modal.component.html',
    styleUrls: ['./registration-email-modal. component.scss']
})
export class RegistrationEmailModalComponent {
    @Input() show: boolean = false;
    @Input({ required: true }) title: string = '';
    @Output() close = new EventEmitter<void>();

    onModalAction(action: number): void {
        if (action === 1) {
        } else {
            this.close.emit();
        }
    }
}