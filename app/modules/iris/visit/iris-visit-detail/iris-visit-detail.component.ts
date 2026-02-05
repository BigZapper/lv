import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DialogActions } from '@app/store/dialog';
import { getIsDesktop, getIsTablet } from '@app/store/dialog/dialog.selectors';
import { IrisActions } from '@app/store/iris';
import { getDetailVisitIris, getDetailVisitIrisLoading, getLocalLab, getLocalLabLoading, getNewVisitAllStep2, getSubjectVisitTemplate } from '@app/store/iris/iris.selector';
import { getUserPreference } from '@app/store/study-site/study-site.selectors';
import { Store } from '@ngrx/store';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-iris-visit-detail',
    templateUrl: './iris-visit-detail.component.html',
    styleUrls: ['./iris-visit-detail.component.scss']
})
export class IrisVisitDetailComponent {
    summaryData: any;
    isTablet = false;
    step1: any;
    step2: any;
    step3: any;
    step4: any;
    step5: any;
    accId = '';
    subjectId = '';
    userPreference: any;
    subjectTemplate: any;
    datePipe = new DatePipe('en-US');


    isDesktop: any = true;
    private readonly destroy$ = new Subject<void>();

    constructor(private store: Store, private router: Router, private route: ActivatedRoute,) {
        this.store.select(getIsDesktop).pipe(takeUntil(this.destroy$)).subscribe(value => {
            this.isDesktop = value;
        });

        if (this.route?.queryParams) {
            this.route.queryParams.subscribe(params => {
                // Reset data khi params thay đổi
                this.step3 = null;
                this.summaryData = null;
                
                this.accId = params['id'] || '';
                this.subjectId = params['sid'] || '';
            })
            if (this.accId === '') {
                this.setLoading(false);
                this.router.navigate(['/']);
            }
            if (this.userPreference?.studySelected && this.userPreference?.siteSelected) {
                this.setLoading(true);
                this.store.dispatch(IrisActions.getSubjectVisitTemplate({
                    studyId: this.userPreference.studySelected,
                    siteId: this.userPreference.siteSelected,
                    currentDate: new Date().toISOString()
                }));
            }
        }

        this.store.select(getUserPreference).pipe(takeUntil(this.destroy$)).subscribe(value => {
            this.userPreference = value;
            if (value && value?.studySelected && value?.siteSelected) {
                this.setLoading(true);
                this.store.dispatch(IrisActions.getSubjectVisitTemplate({
                    studyId: this.userPreference.studySelected,
                    siteId: this.userPreference.siteSelected,
                    currentDate: new Date().toISOString()
                }));
            }
        });
    }
    scrollToTop(id: string) {
        const element = document.getElementById(id) as HTMLElement;
        if (element) {
            setTimeout(function () {
                element.scrollIntoView({ behavior: 'auto', block: 'center' });
            }, 200);
        }
    }

    mapSubjectField(key: string): any {
        const subjectMap: Record<string, any> = {
            SCREENING: { id: "screeningId", key: "Screening ID" },
            SUBJECT: { id: "subjectNumber", key: "Subject ID" }, INITIALS: { id: "initials", key: "Initials" }, SUBJECTSEX: { id: "gender", key: "Gender" },
            DOB: { id: "dateOfBirth", key: "Date of Birth (DOB)" },
        };
        return subjectMap[key] || '';
    }
    subjectInfo(dataForm: any): any {
        const template = Object.keys(this.subjectTemplate)
            .map((s: any) => this.mapSubjectField(s))
            .filter((key: any) => key !== '');
        return template
            .map((tem: any) => ({ key: tem.key, value: dataForm[tem.id] }));
    }
    formatSlashText(s: any): any {
        if (!s) return s;
        return s.includes('/') ? s.replace(/\//g, '/\u200B') : 5;
    }

    ngOnInit() {
        // Reset data trước khi load mới
        this.step1 = null;
        this.step2 = null;
        this.step3 = null;
        this.step4 = null;
        this.step5 = null;
        this.summaryData = null;
        
        setTimeout(() => {
            this.scrollToTop('title');
        }, 200)
        this.store.select(getIsTablet).pipe(takeUntil(this.destroy$)).subscribe(value => {
            this.isTablet = value;
        });
        this.store.select(getSubjectVisitTemplate).pipe(takeUntil(this.destroy$)).subscribe(value => {
            if (value && value.subjectTemplates) {
                this.subjectTemplate = value.subjectTemplates;
                this.fetchViewDetailVisit();
            }
        });
        this.store.select(getDetailVisitIris).pipe(takeUntil(this.destroy$)).subscribe(value => {
            if (value) {
                this.summaryData = value;
                this.fillDataStep1();
                this.fillDataStep2();
                this.fillDataStep3();
                this.fillDataStep4();
                this.fillDataStep5();
                this.setLoading(false);
            }
        });
    }
    fetchViewDetailVisit() {
        const data = {
            accId: this.accId,
            subjectId: this.subjectId,
        }
        this.store.dispatch(IrisActions.getDetailVisitIris({ data }))
    }

    formatDate(originalDate: any) {
        if (!originalDate) return '-';
        const date = new Date(originalDate);
        return this.datePipe.transform(date, 'dd-MMM-yyyy');
    }
    fillDataStep1() {
        const visitInfo = [
            { key: 'Cohort', value: this.summaryData.cohort },
            { key: 'Visit Type', value: this.summaryData.visitTypeText },
            { key: 'Visit Name', value: this.summaryData.visitName },
        ]
        const subjectInfo = this.subjectInfo(this.summaryData);
        const subStep = [
            { key: 'Screen Failure/ Last Visit', value: this.summaryData.isLastVisit ? 'Yes' : 'No' },
            { key: 'Collection Date', value: this.formatDate(this.summaryData.collectionDate) },
            { key: 'Collection Time', value: this.summaryData.collectionTime },
        ]
        this.step1 = [
            ...visitInfo,
            ...subjectInfo,
            ...subStep]
    };
    fillDataStep2() {
        this.step2 = [
            { key: 'Lab Name', value: this.summaryData.labName },
            { key: 'Phone Number', value: this.summaryData.phoneNumber },
            { key: 'City', value: this.summaryData.city },
            { key: 'State/Province', value: this.summaryData.state },
            { key: 'Zip/Postal Code', value: this.summaryData.zip },
            { key: 'Country', value: this.summaryData.country },
        ]
    }
    fillDataStep3() {
        this.step3 = this.summaryData.capturedReports;
    }

    fillDataStep4() {
        this.step4 = this.summaryData.additionalComment;
    }
    fillDataStep5() {
        this.step5 = this.summaryData.addonData;
    }
    setLoading(loading: boolean) {
        this.store.dispatch(DialogActions.setDisplayDialogLoading({ loading }))
    }
    newVisitIris() {
        this.router.navigate(['/iris/new-visit']);
    }

    ngonDestroy(): void {
        this.store.dispatch(IrisActions.resetDetailVisitIris());
        this.destroy$.next();
        this.destroy$.complete();
    }
}