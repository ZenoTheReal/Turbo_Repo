import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, switchMap, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UploadedFileResult {
  fileKey: string;
  publicUrl: string;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  uploadFile(file: File): Observable<UploadedFileResult> {
    return this.http
      .post<{ uploadUrl: string; fileKey: string; publicUrl: string }>(
        `${this.apiUrl}/upload/presigned-url`,
        {
          filename: file.name,
          mimetype: file.type || 'application/octet-stream',
        },
      )
      .pipe(
        switchMap((presigned) =>
          this.http
            .put(presigned.uploadUrl, file, {
              headers: new HttpHeaders({
                'Content-Type': file.type || 'application/octet-stream',
              }),
            })
            .pipe(
              map(() => ({
                fileKey: presigned.fileKey,
                publicUrl: presigned.publicUrl,
              })),
            ),
        ),
      );
  }
}
