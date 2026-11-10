import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface RuntimeConfig { apiBaseUrl: string; }

@Injectable({ providedIn: 'root' })
export class ApiConfigService {
  private readonly http = inject(HttpClient);
  private baseUrl: string | null = null;

  async load(): Promise<void> {
    const config = await firstValueFrom(this.http.get<RuntimeConfig>('/config.json'));
    if (!config || typeof config.apiBaseUrl !== 'string' || !config.apiBaseUrl.trim())
      throw new Error('Falta apiBaseUrl en /config.json');
    const url = new URL(config.apiBaseUrl, document.baseURI);
    if (!['http:', 'https:'].includes(url.protocol))
      throw new Error('Protocolo no permitido en apiBaseUrl');
    if (location.protocol === 'https:' && url.protocol !== 'https:')
      throw new Error('La API debe usar HTTPS cuando la Web usa HTTPS');
    this.baseUrl = url.href.replace(/\/+$/, '');
  }

  get apiBaseUrl(): string {
    if (!this.baseUrl) throw new Error('La configuración de la API no se ha cargado');
    return this.baseUrl;
  }

  url(path: string): string {
    return `${this.apiBaseUrl}/${path.replace(/^\/+/, '')}`;
  }

  isApiUrl(url: string): boolean {
    return url.startsWith(this.apiBaseUrl + '/');
  }
}
