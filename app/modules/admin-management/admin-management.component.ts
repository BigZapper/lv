import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, takeUntil } from 'rxjs';
import { getIsDesktop } from '@app/store/dialog/dialog.selectors';

interface Tab {
    label: string;
    route: string;
}

@Component({
    selector: 'app-admin-management',
    templateUrl: './admin-management. component.html',
    styleUrls: ['./admin-management. component. scss']
})
export class AdminManagementComponent implements OnInit, OnDestroy {
    private readonly destroy$ = new Subject<void>();

    isDesktop = false;

    tabs: Tab[] = [
        { label: 'Manage Protocols', route: 'manage-protocols' },
        { label: 'Manage Profiles', route: 'manage-profiles' },
        { label: 'Manage Capabilities', route: 'manage-capabilities' }

    ]

    constructor(
        private store: Store,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.store.select(getIsDesktop)
            .pipe(takeUntil(this.destroy$))
            .subscribe(value => {
                this.isDesktop = value;
            });
    }
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
    isActiveTab(route: string): boolean {
        return this.router.url.includes(route);

    }

    navigateToTab(route: string): void {
        this.router.navigate(['/admin-management', route]);
    }
}