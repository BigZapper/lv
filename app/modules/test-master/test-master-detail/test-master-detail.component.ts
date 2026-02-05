import { ChangeDetectorRef, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { getIsDesktop } from '@app/store/dialog/dialog.selectors';
import { Store } from '@ngrx/store';
import { Subject, takeUntil } from 'rxjs';

type SectionKey = 'general' | 'assay' | 'specimen' | 'reference' | 'loinc';

@Component({
    selector: 'app-test-master-details',
    templateUrl: './test-master-details.component.html',
    styleUrls: ['./test-master-details.component.scss'],
})

export class TestMasterDetailsComponent {
    private readonly destroy$ = new Subject<void>();
    @ViewChild('scrollContainer', { static: true })
    scrollContainer !: ElementRef<HTMLElement>;
    isDesktop = false;
    isManualScroll = false;

    constructor(private router: Router, private store: Store) {
    }

    ngOnInit() {
        this.store.select(getIsDesktop).pipe(takeUntil(this.destroy$)).subscribe(value => {
            this.isDesktop = value;
        })
    }
    expanded: Record<SectionKey, boolean> = {
        general: true,
        assay: true,
        specimen: true,
        reference: true,
        loinc: true,
    };

    sections: { key: SectionKey; title: string, anchorId: string }[] = [
        { key: 'general', title: 'General Information', anchorId: 'general-information' },
        { key: 'assay', title: 'Assay Summary', anchorId: 'assay-summary' },
        { key: 'specimen', title: 'Specimen Type', anchorId: 'specimen-type' },
        { key: 'reference', title: 'Reference Ranges', anchorId: 'reference-ranges' },
        { key: 'loinc', title: 'LOINC Codes', anchorId: 'loinc-codes' },
    ]
    activeAnchorId = this.sections[0].anchorId; // load: first is active
    private io?: IntersectionObserver;

    private navSelector = 'header';
    private navHeight = 0;

    ngAfterViewInit(): void {
        this.navHeight = this.getNavHeight();
        this.updateActive();

    }

    onContainerScroll(): void {
        if (this.isManualScroll) return;
        this.updateActive();
    }
    private getNavHeight(): number {
        const nav = document.querySelector(this.navSelector) as HTMLElement | null;
        return nav ? nav.getBoundingClientRect().height : 0;

    }

    private updateActive(): void {
        const lineY = this.navHeight + 1;

        let bestId: string | null = null;
        let bestDiff = Number.POSITIVE_INFINITY;

        for (const s of this.sections) {
            const hdr = document.getElementById(`${s.anchorId}-hdr`);
            if (!hdr) continue;

            const top = hdr.getBoundingClientRect().top - 327;
            const diff = lineY - top;

            if (diff >= 0 && diff < bestDiff) {
                bestDiff = diff;
                bestId = s.anchorId;
            }
        }
        this.activeAnchorId = bestId ?? this.sections[0].anchorId;
    }
    toggle(key: SectionKey): void {
        this.expanded[key] = !this.expanded[key];
    }
    goBack(): void {
        history.back();
    }
    exportPdf(): void {
        console.log('Export as PDF will be implementing ... ');
    }
    scrollTo(anchorId: string) {
        this.activeAnchorId = anchorId;
        this.isManualScroll = true;
        const el = document.getElementById(anchorId);
        if (!el) return;
        const wrapperEl = document.getElementById('wrapper-desktop-test');
        if (!wrapperEl) return;
        setTimeout(() => {
            el.scrollIntoView({ behavior: 'auto', block: 'start' });
            wrapperEl.scrollIntoView({ behavior: 'auto', block: 'start' });
        }, 200);
        setTimeout(() => { this.isManualScroll = false; }, 600)
    }
    ngOnDestroy(): void {
        this.io?.disconnect();
        this.destroy$.next();
        this.destroy$.complete();
    }
}