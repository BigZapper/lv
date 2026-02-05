import { Component, Input, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
    selector: 'app-custom-checkbox',
    templateUrl: './custom-checkbox. component.html',
    styleUrls: ['./custom-checkbox.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => CustomCheckboxComponent),
            multi: true,
        }]
})
export class CustomCheckboxComponent {

    @Input() label = '';
    @Input() isInvalid = false;
    @Input() id = '';
    @Input() isPrivacy = false;
    @Input() isTraining = false;
    isChecked = false;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onChange: any = () => { };
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onTouched: any = () => { };

    writeValue(value: any): void {
        this.isChecked = value;
    }
    registerOnChange(fn: any): void {
        this.onChange = fn;
    }
    registerOnTouched(fn: any): void {
        this.onTouched = fn;
    }
    setDisabledState?(isDisabled: boolean): void {
        // You can implement this method if you want to handle the disabled state
    }
}