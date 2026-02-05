import { Component } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { CheckAuthenticationService } from '@app/shared/services/check-authentication.service';
import { instructionalIrisVideos, instructionalLV360Videos, Roles } from '@app/shared/utils';
import { getIsDesktop } from '@app/store/dialog/dialog.selectors';
import { Store } from '@ngrx/store';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-instructional-videos',
    templateUrl: './instructional-videos.component.html',
    styleUrls: ['./instructional-videos.component.scss']
})
export class InstructionalVideosComponent {
    isDesktop: any = true;
    isTablet: any = false;
    videoId = '';
    iframeUrl: SafeResourceUrl | undefined = undefined;
    roles = Roles;
    data = instructionalLV360Videos;
    dataIris = instructionalIrisVideos
    private readonly destroy$ = new Subject<void>();
    constructor(private router: Router, private store: Store, private checkAuthenticationService: CheckAuthenticationService) {
    }
    ngOnInit() {
        this.store.select(getIsDesktop).pipe(takeUntil(this.destroy$)).subscribe(value => {
            this.isDesktop = value;
        })
        if (this.checkAuthenticationService.roles.includes(Roles.IRIS)) this.data = this.dataIris;

    };
    onClickVideo(item: any) {
        const queryParams = {
            videoId: item.videold,
        }
        this.router.navigate(['/support/help/view-video'], { queryParams });
    }
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}