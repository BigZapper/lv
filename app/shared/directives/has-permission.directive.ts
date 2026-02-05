import { Directive, Input, OnDestroy, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { CheckAuthenticationService } from '../services/check-authentication.service';

@Directive({
    selector: '[appHasRoles]',
    // standalone: true
})
export class HasPermissionDirective implements OnInit, OnDestroy {
    private sub?: Subscription;
    private acl?: Subscription;

    private wanted!: string | string[];
    private hasAccess = 0;
    private codeAccess!: string[];

    constructor(
        private tpl: TemplateRef<unknown>,
        private vcr: ViewContainerRef,
        private auth: CheckAuthenticationService
    ) { }

    @Input() set appHasRoles(value: string | string[]) {
        this.wanted = value;
        this.check();
    }

    @Input() set appHasAccessFeatures(value: string | string[]) {
        if (!value) {
            this.hasAccess = 0;
        }
        else {
            const requiredAccess = Array.isArray(value) ? value : [value];
            this.codeAccess = requiredAccess;
            const isAccess = this.auth.hasAccessFeatures(requiredAccess)
            this.hasAccess = isAccess ? 1 : 2
        }
    }
    ngOnInit() {
        this.sub = this.auth.roles$.subscribe(() => this.check());
        this.acl = this.auth.pageAcl$.subscribe(() => this.check());
    }

    onNgDestroy() {
        this.sub?.unsubscribe();
        this.acl?.unsubscribe();
    }

    private check() {
        this.vcr.clear();
        this.checkAccessFeatures();
        if (this.auth.hasRoles(this.wanted) && (this.hasAccess === 1 || this.hasAccess === 0)) {
            this.vcr.createEmbeddedView(this.tpl);
        }
    }
    private checkAccessFeatures() {
        if (!this.codeAccess) {
            this.hasAccess = 0;
        }
        else {
            const isAccess = this.auth.hasAccessFeatures(this.codeAccess)
            this.hasAccess = isAccess ? 1 : 2
        }
    }
}