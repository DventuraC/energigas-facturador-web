import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService, JwtLoginResponse } from './auth.service';
import { ApiConfigService } from './api-config.service';

type EstadoEtapa = 'bloqueada' | 'lista' | 'correcta' | 'error';
type DocumentoCargaEstado = {
  orden: number; fecha: string; fechaVencimiento: string | null; tipoDocumento: number; serie: string; numero: number;
  motivoNota: number | null; ruc: string | null; moneda: number | null; observacion: string | null;
  subtotal: number | null; impuesto: number | null; total: number | null; estado: string; detalle: string | null;
};
type DetalleVenta = { idItem: string | null; cantidad: number | null; precio: number | null; importe: number | null; idCentroCosto: number | null; producto: string | null; centroCosto: string | null };

@Component({
  imports: [CommonModule],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiConfig = inject(ApiConfigService);
  protected readonly auth = inject(AuthService);
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly loginError = signal('');
  protected readonly loginBusy = signal(false);
  protected readonly mfaStatus = signal('');
  protected login() {
    if (!this.email().trim() || !this.password()) { this.loginError.set('Ingresa correo y contraseña.'); return; }
    this.loginBusy.set(true); this.loginError.set('');
    this.auth.login(this.email().trim(), this.password()).pipe(finalize(() => this.loginBusy.set(false))).subscribe({
      next: (result: JwtLoginResponse) => {
        this.password.set('');
        if (this.auth.acceptLogin(result)) {
          this.mfaStatus.set('');
          this.cargarTipos(); this.buscarDocumentos();
        } else if (result.setup || result.challenge) {
          this.mfaStatus.set('La cuenta requiere verificación MFA. El proveedor debe habilitar el flujo de confirmación.');
        } else {
          this.loginError.set(result.tokens?.message || 'No fue posible completar el inicio de sesión.');
        }
      },
      error: (error: HttpErrorResponse) => {
        this.password.set('');
        this.loginError.set(error.error?.message || 'No fue posible iniciar sesión.');
      }
    });
  }
  protected readonly seccion = signal<'ventas' | 'compras'>('ventas');
  protected readonly vista = signal<'documentos' | 'carga'>('documentos');
  protected readonly archivo = signal<File | null>(null);
  protected readonly cargaId = signal<string | null>(null);
  protected readonly mensaje = signal('Selecciona un archivo para validar su estructura.');
  protected readonly errores = signal<string[]>([]);
  protected readonly documentosCarga = signal<DocumentoCargaEstado[]>([]);
  protected readonly procesando = signal(false);
  protected readonly etapas = signal<Record<'validar' | 'auxiliares' | 'carga', EstadoEtapa>>({
    validar: 'bloqueada', auxiliares: 'bloqueada', carga: 'bloqueada'
  });
  protected readonly mensajesEtapa = signal<Record<'validar' | 'auxiliares' | 'carga', string>>({
    validar: 'Carga un archivo .xlsx para iniciar.', auxiliares: 'Pendiente de validar el archivo.', carga: 'Pendiente de cargar auxiliares.'
  });
  protected readonly columnasRequeridas = [
    { nombre: 'fecha', formato: 'Fecha', requerido: true }, { nombre: 'fechav', formato: 'Fecha', requerido: false },
    { nombre: 'tipodocumento', formato: 'Entero', requerido: true }, { nombre: 'serie', formato: 'Varchar', requerido: true },
    { nombre: 'numero', formato: 'Entero', requerido: true }, { nombre: 'motivonota', formato: 'Entero', requerido: false },
    { nombre: 'ruc', formato: 'Varchar', requerido: false }, { nombre: 'moneda', formato: 'Entero', requerido: false },
    { nombre: 'observacion', formato: 'Varchar', requerido: false }, { nombre: 'subtotal', formato: 'Decimal', requerido: false },
    { nombre: 'impuesto', formato: 'Decimal', requerido: false }, { nombre: 'total', formato: 'Decimal', requerido: false },
    { nombre: 'serie (referencia)', formato: 'Varchar', requerido: false }, { nombre: 'numero (referencia)', formato: 'Entero', requerido: false },
    { nombre: 'iditem', formato: 'Entero largo', requerido: true }, { nombre: 'cantidad', formato: 'Decimal', requerido: false },
    { nombre: 'precio', formato: 'Decimal', requerido: false }, { nombre: 'subtotal (ítem)', formato: 'Decimal', requerido: false },
    { nombre: 'ccosto', formato: 'Entero', requerido: false }
  ];
  protected readonly fechaInicio = signal('2026-11-01');
  protected readonly fechaFin = signal('2026-11-09');
  protected readonly serie = signal(''); protected readonly numero = signal(''); protected readonly clienteRuc = signal('');
  protected readonly tipos = signal<{idDocumento:number; nombre:string}[]>([]);
  protected readonly tipoSeleccionado = signal<number | null>(null);
  protected readonly documentos = signal<any[]>([]); protected readonly totalDocumentos = signal(0);
  protected readonly pagina = signal(1); protected readonly tamanoPagina = signal(25);
  protected readonly columnaExpandida = signal<string | null>(null);
  protected readonly detalleDocumentoOp = signal<number | null>(null);
  protected readonly detalleVentas = signal<DetalleVenta[]>([]);
  protected readonly detalleCargando = signal(false);
  private get api(): string { return this.apiConfig.apiBaseUrl; }
  private tipoInicializado = false;

  ngOnInit() {
    if (this.auth.isAuthenticated()) this.cargarTipos();
  }

  navegar(seccion: 'ventas' | 'compras', vista: 'documentos' | 'carga') {
    this.seccion.set(seccion);
    this.vista.set(vista);
    this.reiniciarCarga();
    if (seccion === 'ventas' && vista === 'documentos') this.cargarTipos();
  }

  etiquetaArea() { return this.seccion() === 'ventas' ? 'Ventas' : 'Compras'; }
  actualizarTexto(campo: 'fechaInicio'|'fechaFin'|'serie'|'numero'|'clienteRuc', event: Event) { (this[campo] as any).set((event.target as HTMLInputElement).value); }
  cambiarTipo(event: Event) { const valor = (event.target as HTMLSelectElement).value; this.tipoSeleccionado.set(valor ? Number(valor) : null); }
  limpiarFiltros() { this.serie.set(''); this.numero.set(''); this.clienteRuc.set(''); this.tipoSeleccionado.set(this.tipoFactura()?.idDocumento ?? null); this.buscarDocumentos(true); }
  alternarColumna(columna: string) { this.columnaExpandida.update(actual => actual === columna ? null : columna); }
  alternarDetalle(doc: any) {
    if (this.detalleDocumentoOp() === doc.op) { this.detalleDocumentoOp.set(null); this.detalleVentas.set([]); return; }
    this.detalleDocumentoOp.set(doc.op); this.detalleVentas.set([]); this.detalleCargando.set(true);
    const params = new HttpParams().set('notaCredito', String(doc.origen === 'Nota de crédito'));
    this.http.get<DetalleVenta[]>(`${this.api}/ventas/documentos/${doc.op}/detalle`, { params }).pipe(finalize(() => this.detalleCargando.set(false))).subscribe({ next: r => this.detalleVentas.set(r), error: () => this.detalleVentas.set([]) });
  }
  textoResumido(valor: string | null | undefined, limite = 20) { if (!valor) return '—'; return valor.length > limite ? `${valor.slice(0, limite)}…` : valor; }
  tipoFactura() { return this.tipos().find(x => x.nombre.toLowerCase() === 'factura (ns-venta)'); }
  cargarTipos() { let p = new HttpParams().set('fechaInicio', this.fechaInicio()).set('fechaFin', this.fechaFin()); this.http.get<{idDocumento:number; nombre:string}[]>(`${this.api}/ventas/tipos-documento`, {params:p}).subscribe({next:r=>{ this.tipos.set(r); if (!this.tipoInicializado) { this.tipoSeleccionado.set(this.tipoFactura()?.idDocumento ?? null); this.tipoInicializado = true; } this.buscarDocumentos(true); }, error:()=>{this.tipos.set([]); this.buscarDocumentos(true);}}); }
  totalPaginas() { return Math.max(1, Math.ceil(this.totalDocumentos() / this.tamanoPagina())); }
  buscarDocumentos(reiniciar = false) { if (reiniciar) this.pagina.set(1); let p = new HttpParams().set('fechaInicio',this.fechaInicio()).set('fechaFin',this.fechaFin()).set('pagina',String(this.pagina())).set('tamanoPagina',String(this.tamanoPagina())); if(this.serie()) p=p.set('serie',this.serie()); if(this.numero()) p=p.set('numero',this.numero()); if(this.clienteRuc()) p=p.set('clienteRuc',this.clienteRuc()); if(this.tipoSeleccionado() !== null) p=p.append('tiposDocumento',this.tipoSeleccionado()!); this.http.get<any>(`${this.api}/ventas/documentos`,{params:p}).subscribe({next:r=>{this.documentos.set(r.items);this.totalDocumentos.set(r.total);this.pagina.set(r.pagina)},error:()=>{this.documentos.set([]);this.totalDocumentos.set(0)}}); }
  cambiarPagina(delta: number) { const destino = Math.min(this.totalPaginas(), Math.max(1, this.pagina() + delta)); if (destino !== this.pagina()) { this.pagina.set(destino); this.buscarDocumentos(); } }
  cambiarTamano(event: Event) { this.tamanoPagina.set(Number((event.target as HTMLSelectElement).value)); this.buscarDocumentos(true); }

  seleccionarArchivo(event: Event) {
    const input = event.target as HTMLInputElement;
    const cargaAnterior = this.cargaId();
    if (cargaAnterior) this.http.delete(`${this.api}/cargas/${cargaAnterior}`).subscribe();
    this.archivo.set(input.files?.[0] ?? null);
    this.cargaId.set(null); this.errores.set([]); this.documentosCarga.set([]);
    const hayArchivo = !!this.archivo();
    this.etapas.set({ validar: hayArchivo ? 'lista' : 'bloqueada', auxiliares: 'bloqueada', carga: 'bloqueada' });
    this.mensajesEtapa.set({
      validar: hayArchivo ? `Listo para validar: ${this.archivo()!.name}` : 'Carga un archivo .xlsx para iniciar.',
      auxiliares: 'Pendiente de validar el archivo.', carga: 'Pendiente de cargar auxiliares.'
    });
    this.mensaje.set(hayArchivo ? `Archivo seleccionado: ${this.archivo()!.name}` : 'Selecciona un archivo para validar su estructura.');
  }

  eliminarArchivo(input: HTMLInputElement) {
    const cargaAnterior = this.cargaId();
    if (cargaAnterior) this.http.delete(`${this.api}/cargas/${cargaAnterior}`).subscribe();
    input.value = '';
    this.reiniciarCarga();
  }

  private reiniciarCarga() {
    this.archivo.set(null); this.cargaId.set(null); this.errores.set([]); this.documentosCarga.set([]); this.procesando.set(false);
    this.etapas.set({ validar: 'bloqueada', auxiliares: 'bloqueada', carga: 'bloqueada' });
    this.mensajesEtapa.set({ validar: 'Carga un archivo .xlsx para iniciar.', auxiliares: 'Pendiente de validar el archivo.', carga: 'Pendiente de cargar auxiliares.' });
    this.mensaje.set('Selecciona un archivo para validar su estructura.');
  }

  validar() {
    const archivo = this.archivo(); if (!archivo) return;
    const data = new FormData(); data.append('archivo', archivo); this.procesando.set(true);
    this.http.post<{ cargaId: string; registrosValidos: number; errores: string[]; documentos: DocumentoCargaEstado[] }>(`${this.api}/cargas/validar`, data).subscribe({
      next: resultado => {
        const tieneErrores = resultado.errores.length > 0;
        this.cargaId.set(tieneErrores ? null : resultado.cargaId || null); this.errores.set(resultado.errores); this.documentosCarga.set(resultado.documentos ?? []);
        this.etapas.set({ validar: tieneErrores ? 'error' : 'correcta', auxiliares: tieneErrores ? 'bloqueada' : 'lista', carga: 'bloqueada' });
        this.mensajesEtapa.set({ validar: tieneErrores ? 'La validación encontró errores.' : `${resultado.registrosValidos} documento(s) validado(s).`, auxiliares: tieneErrores ? 'Pendiente de corregir el archivo.' : 'Listo para cargar auxiliares.', carga: 'Pendiente de cargar auxiliares.' });
        this.mensaje.set(tieneErrores ? 'Se encontraron errores de estructura.' : `${resultado.registrosValidos} documento(s) validado(s).`); this.procesando.set(false);
      },
      error: () => { this.etapas.update(x => ({ ...x, validar: 'error' })); this.mensajesEtapa.update(x => ({ ...x, validar: 'No fue posible validar el archivo.' })); this.mensaje.set('No fue posible validar el archivo. Verifica que la API esté activa.'); this.procesando.set(false); }
    });
  }

  procesar() {
    const id = this.cargaId(); if (!id) return; this.procesando.set(true);
    this.http.post<{ insertados: number; reemplazados: number; duplicados: number; mensaje: string; documentos: DocumentoCargaEstado[] }>(`${this.api}/cargas/${id}/procesar`, {}).subscribe({
      next: resultado => { this.documentosCarga.set(resultado.documentos ?? []); this.etapas.update(x => ({ ...x, auxiliares: 'correcta', carga: 'lista' })); this.mensajesEtapa.update(x => ({ ...x, auxiliares: `${resultado.insertados} insertado(s) · ${resultado.reemplazados} reemplazado(s) · ${resultado.duplicados} omitido(s).`, carga: 'Listo para ejecutar la carga masiva.' })); this.mensaje.set(`${resultado.mensaje} Insertados: ${resultado.insertados}. Reemplazados: ${resultado.reemplazados}. Duplicados: ${resultado.duplicados}.`); this.procesando.set(false); },
      error: () => { this.etapas.update(x => ({ ...x, auxiliares: 'error' })); this.mensajesEtapa.update(x => ({ ...x, auxiliares: 'No se pudieron cargar los auxiliares.' })); this.mensaje.set('La carga no pudo procesarse. Revisa la conexión configurada en la API.'); this.procesando.set(false); }
    });
  }

  ejecutarProcedimiento() {
    this.procesando.set(true);
    this.http.post<{ mensaje: string }>(`${this.api}/cargas/ejecutar-procedimiento`, {}).subscribe({
      next: resultado => { this.etapas.update(x => ({ ...x, carga: 'correcta' })); this.mensajesEtapa.update(x => ({ ...x, carga: resultado.mensaje })); this.mensaje.set(resultado.mensaje); this.procesando.set(false); },
      error: () => { this.etapas.update(x => ({ ...x, carga: 'error' })); this.mensajesEtapa.update(x => ({ ...x, carga: 'No se pudo ejecutar la carga masiva.' })); this.mensaje.set('El procedimiento no pudo ejecutarse. Revisa el resultado de la API.'); this.procesando.set(false); }
    });
  }
}
