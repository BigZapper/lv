import { Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { FeatureAccessMap, getUserGuideFile, getIRISUserGuide, Roles } from '@app/shared/utils';
import { DialogActions } from '@app/store/dialog';
import { getIsDesktop } from '@app/store/dialog/dialog.selectors';
import { VisitActions } from '@app/store/visit';
import { Store } from '@ngrx/store';
import { Subject, takeUntil } from 'rxjs';
import { CheckAuthenticationService } from '@app/shared/services/check-authentication.service';

@Component({
    selector: 'app-user-guide',
    templateUrl: './user-guide.component.html',
    styleUrls: ['./user-guide.component.scss']
})
export class UserGuideComponent {
    isDesktop: any = true;
    isTablet: any = false;
    appVersion = "";
    newFeaturesData: any = [];
    featureAccessMap: FeatureAccessMap;
    roles = Roles;
    isIRISUser = false;
    @Output() childActionTriggered = new EventEmitter<void>();
    private readonly destroy$ = new Subject<void>();

    constructor(private store: Store, private router: Router, private auth: CheckAuthenticationService) { }

    ngOnInit() {
        this.store.select(getIsDesktop).pipe(takeUntil(this.destroy$)).subscribe(value => {
            this.isDesktop = value;
        });
        
        this.isIRISUser = this.auth.hasRoles([Roles.IRIS]);
    }
    navigateToEnterBarcode() {
        this.store.dispatch(VisitActions.setStudyAndSiteOfKit({ data: null }));
        this.store.dispatch(VisitActions.setStudyAndSiteOfKitFailure({ data: '' }));
        this.store.dispatch(VisitActions.setStudyAndSiteOfKitExpired({ data: '' }));
        if (this.isDesktop) {
            this.store.dispatch(DialogActions.setDisplayDialogEnterBarcode({ displayDialogEnterBarcode: true }));
        } else {
            this.router.navigate(['/new-visit/enter-barcode']);
        }
    }

    newVisitIris() {
        this.router.navigate(['/iris/new-visit']);
    }

    openUserGuide() {
        return getUserGuideFile();
    }

    openIRISUserGuide() {
        return getIRISUserGuide();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}