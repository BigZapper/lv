/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SortEvent, TableColumn } from '@app/shared/components/reusable-table/reusable-table.component';
import { AdminManagementService, DebounceService } from '@app/shared/services';
import { DialogActions } from '@app/store/dialog';
import { getIsDesktop } from '@app/store/dialog/dialog.selectors';
import { Store } from '@ngrx/store';
import { firstValueFrom, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-manage-capabilities',
  templateUrl: './manage-capabilities.component.html',
  styleUrls: ['./manage-capabilities.component.scss']
})
export class ManageCapabilitiesComponent {
  tableColumns: TableColumn[] = [
    { title: 'Capability Name', key: 'capabilityName', sortable: true, class: 'text-left', sortField: 'CapabilityName', widthColumn: 'calc(50%- 45px)' },
    { title: 'URL', key: 'url', sortable: true, class: 'text-left', sortField: 'URL', widthColumn: 'calc(50%- 45px)' },
    { title: 'Actions', key: 'Action', sortable: false, class: 'text-center noHover', widthColumn: "90px", classData: "green-color-text hover" }
  ];

  isDesktop: any;
  sortType = 0;
  sortField = '';
  pageSize = 20;
  page = 1;
  capabilityTotal = 0;
  capabilityNameFilter: any = '';
  searchFilter: any = "";
  urlFilter: any = "";
  capabilityList: any[] = [];

  convertKey(data: any): string {
    if (!data) return '';
    if (data === "URL") return "url";
    if (data === "CapabilityName") return "capabilityName";
    return data;
  }

  get currentSortObj(): any {
    const dir: "asc" | 'desc' | 'none' = this.sortType === 1 ? 'desc' : 'asc';
    return { [this.convertKey(this.sortField)]: dir };
  }

  onTableSort(event: SortEvent): void {
    if (event.direction === "none" || !event.direction) {
      return;
    }
    this.sortField = event.column;
    this.sortType = event.direction === 'asc' ? 2 : 1;
    //need to get data here
    this.parseToParam();
  }

  private readonly destroy$ = new Subject<void>();
  constructor(private store: Store, private router: Router, private debounceService: DebounceService, private route: ActivatedRoute, private adminManagementService: AdminManagementService) {
    this.store.select(getIsDesktop).pipe(takeUntil(this.destroy$)).subscribe(value => {
      this.isDesktop = value;
    });

    if (this.route?.queryParams) {
      this.route.queryParams.subscribe(params => {
        this.searchFilter = params['search'];
        this.urlFilter = params['url'];
        this.capabilityNameFilter = params['capabilityName'];
        const page = params['page'];
        const sortType = params['sortType'];
        const sortField = params['sortField'];
        this.sortField = sortField || '';
        this.sortType = sortType ? sortType : '';
        this.page = page ? page : 1;
      })
    }
  }
  ngOnInit() {
    if (this.route?.queryParams) {
      this.route.queryParams.subscribe(params => {
        if (Object.keys(params).length > 0) {
          this.searchFilter = params['search'];
          this.urlFilter = params['url'];
          this.capabilityNameFilter = params['capabilityName'];
          const page = params['page'];
          const sortType = params['sortType'];
          const sortField = params['sortField'];
          this.sortField = sortField || '';
          this.sortType = sortType ? sortType : '';
          this.page = page ? page : 1;
          this.fetchSearchCapabilityList();
        }
      });
    }
  }

  onApplyFilters() {
    this.page = 1;
    this.parseToParam();
  }
  parseToParam() {
    const queryParams = {
      page: this.page,
      sortType: this.sortType || '',
      sortField: this.sortField || '',
      search: this.searchFilter || '',
      url: this.urlFilter || '',
      capabilityName: this.capabilityNameFilter || ''
    } as any;
    this.router.navigate(['/admin-management/manage-capabilities'], { queryParams });
  }
  onClearFilters() {
    this.searchFilter = '';
    this.urlFilter = '';
    this.capabilityNameFilter = '';
    this.parseToParam();
  }
  get isResetSearch() {
    return this.searchFilter === null || this.searchFilter === '';
  }
  get isResetCapabilityName() {
    return this.capabilityNameFilter === null || this.capabilityNameFilter === '';
  }
  get isResetUrl() {
    return this.urlFilter === null || this.urlFilter === '';
  }

  async fetchSearchCapabilityList() {
    try {
      this.setLoading(true);
      const payload = {
        page: this.page,
        sortType: this.sortType || '',
        sortField: this.sortField || '',
        search: this.searchFilter || '',
        url: this.urlFilter || '',
        pageSize: this.pageSize,
        capabilityName: this.capabilityNameFilter || ''
      } as any;
      const response = await firstValueFrom(this.adminManagementService.getCapabilityList(payload));
      this.capabilityList = response?.data?.items;
      this.capabilityList = this.capabilityList.map((item: any) => { return { ...item, Action: 'View' } })
      this.capabilityTotal = response?.data?.totalCount;
      this.setLoading(false);
    }
    catch (error) {
      this.capabilityList = [];
      this.setLoading(false);
    }
  }
  onClickAddNewCapabilities() {
    console.log('on click');
  }
  onActionPage(page: number) {
    if (page === 1) {
      this.page++;
    } else {
    }
    this.page--;
    this.parseToParam();
  }

  setLoading(loading: boolean) {
    this.store.dispatch(DialogActions.setDisplayDialogLoading({ loading }));
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.store.dispatch(DialogActions.setDisplayDialogLoading({ loading: false }));
  }
}