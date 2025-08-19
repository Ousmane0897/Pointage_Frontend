import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FileEntry } from '../models/FileEntry.model';

@Injectable({
  providedIn: 'root'
})
export class StockageService {

  constructor(private http: HttpClient) { }

  listFiles() {
    return this.http.get<FileEntry[]>('/api/dropbox/list');
  }
  uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post('/api/dropbox/upload', formData);
  }
  deleteFile(path: string) {
    return this.http.post('/api/dropbox/delete', { path });
  }
  downloadFile(path: string) {
    return this.http.get(`/api/dropbox/download/${encodeURIComponent(path)}`, { responseType: 'blob' });
  }
  getFileUrl(path: string) {
    return this.http.get(`/api/dropbox/get-url/${encodeURIComponent(path)}`, { responseType: 'text' });
  }
  getFileContent(path: string) {
    return this.http.get(`/api/dropbox/content/${encodeURIComponent(path)}`, { responseType: 'text' });
  }
  createFolder(path: string) {
    return this.http.post('/api/dropbox/create-folder', { path });
  }

  moveFile(sourcePath: string, destinationPath: string) {
    return this.http.post('/api/dropbox/move', { sourcePath, destinationPath });
  }

  copyFile(sourcePath: string, destinationPath: string) {
    return this.http.post('/api/dropbox/copy', { sourcePath, destinationPath });
  }

  renameFile(oldPath: string, newPath: string) {
    return this.http.post('/api/dropbox/rename', { oldPath, newPath });
  }
  getFileMetadata(path: string) {
    return this.http.get(`/api/dropbox/metadata/${encodeURIComponent(path)}`);
  }
  searchFiles(query: string) {
    return this.http.get<FileEntry[]>(`/api/dropbox/search?query=${encodeURIComponent(query)}`);
  }
 

}
