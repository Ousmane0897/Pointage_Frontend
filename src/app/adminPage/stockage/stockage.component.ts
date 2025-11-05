import { Component } from '@angular/core';
import { FileEntry, } from '../../models/FileEntry.model';
import { DomSanitizer } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-stockage',
    imports: [
        CommonModule
    ],
    templateUrl: './stockage.component.html',
    styleUrl: './stockage.component.scss'
})
export class StockageComponent {

 files: FileEntry[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadFiles();
  }

  loadFiles() {
    this.http.get<FileEntry[]>('/api/dropbox/list').subscribe(files => this.files = files);
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    this.http.post('/api/dropbox/upload', formData).subscribe(() => this.loadFiles());
  }

  deleteFile(path: string) {
    this.http.post('/api/dropbox/delete', { path }).subscribe(() => this.loadFiles());
  }
}
