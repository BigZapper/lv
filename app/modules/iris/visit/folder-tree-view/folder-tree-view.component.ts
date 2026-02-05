import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { getReportIrisFile } from '@app/shared/utils/file';
import { getIsDesktop } from '@app/store/dialog/dialog.selectors';
import { Store } from '@ngrx/store';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-folder-tree-view',
    templateUrl: './folder-tree-view.component.html',
    styleUrls: ['./folder-tree-view.component.scss']
})
export class FolderTreeViewComponent implements OnChanges {
    @Input() attachedReports: any[] = [];
    @Input() rootFiles: any[] = [];
    
    isDesktop: any = true;
    private readonly destroy$ = new Subject<void>();

    constructor(private store: Store) { 
        this.store.select(getIsDesktop).pipe(takeUntil(this.destroy$)).subscribe(value => {
            this.isDesktop = value;
        }
    )}
    folderExpandState: Map<number, boolean> = new Map();

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['attachedReports'] || changes['rootFiles']) {
            this.folderExpandState.clear();
        }
    }

    toggleFolder(index: number): void {
        const currentState = this.folderExpandState.get(index) || false;
        this.folderExpandState.set(index, !currentState);
    }

    isFolderExpanded(index: number): boolean {
        return this.folderExpandState.get(index) || false;
    }

    download(file: any) {
        return getReportIrisFile(file);
    }

    getFileIcon(fileName: string): string {
        if (!fileName) {
            return '/assets/images/icon/unknown.svg';
        }

        const ext = fileName.split('.').pop()?.toLowerCase();

        switch (ext) {
            case 'pdf':
                return '/assets/images/icon/pdf.svg';
            case 'doc':
                return '/assets/images/icon/doc.svg';
            case 'docx':
                return '/assets/images/icon/docx.svg';
            case 'txt':
                return '/assets/images/icon/txt.svg';
            default:
                return '/assets/images/icon/unknown.svg';
        }
    }
    
    ngonDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
