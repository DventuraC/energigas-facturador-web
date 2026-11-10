import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface RuntimeConfig { apiBaseUrl: string; }

@Injectable({ providedIn: 'root' })
export class ApiConfigService {
  private readonly http = inject(HttpClient);
  private baseUrl: string | null = null;
  readonly configurationError = signal<string | null>(null);

  async load(): Promise<void> {
    try {
      // Relative to the Angular base href, so deployments under a subpath work.
      const config = await firstValueFrom(this.http.get<RuntimeConfig>('config.json'));
      if (!config || typeof config.apiBaseUrl !== 'string' || !config.apiBaseUrl.trim())
        throw new Error('Falta apiBaseUrl en config.json');
      const url = new URL(config.apiBaseUrl, document.baseURI);
      if (!['http:', 'https:'].includes(url.protocol))
        throw new Error('Protocolo no permitido en apiBaseUrl');
      if (location.protocol === 'https:' && url.protocol !== 'https:')
        throw new Error('La API debe usar HTTPS cuando la Web usa HTTPS');
      this.baseUrl = url.href.replace(/\/+$/, '');
      this.configurationError.set(null);
    } catch (error) {
      this.baseUrl = null;
      this.configurationError.set('No se pudo cargar la configuración de la API (config.json). Contacta al administrador.');
      console.error('Error de configuración del backend:', error);
      // Do not reject the Angular app initializer: the login screen must still render.
    }
  }

  get apiBaseUrl(): string {
    if (!this.baseUrl) throw new Error('La configuración de la API no se ha cargado');
    return this.baseUrl;
  }

  url(path: string): string {
    return `${this.apiBaseUrl}/${path.replace(/^\/+/, '')}`;
  }

  isApiUrl(url: string): boolean {
    return this.baseUrl !== null && url.startsWith(this.baseUrl + '/');
  }
}
