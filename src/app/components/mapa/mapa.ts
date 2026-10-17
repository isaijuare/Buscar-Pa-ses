import { Component, DestroyRef, ElementRef, afterNextRender, effect, inject, input, output, signal, viewChild } from '@angular/core';
import type * as Leaflet from 'leaflet';

export interface MarcadorMapa {
  lat: number;
  lon: number;
  titulo: string;
  subtitulo?: string;
  url?: string;
}

@Component({
  selector: 'app-mapa',
  standalone: true,
  template: `
    <div class="contenedor">
      <div #lienzo class="lienzo" role="application" [attr.aria-label]="etiqueta()"></div>
      @if (!listo()) {
        <p class="cargando">Cargando mapa…</p>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .contenedor { position: relative; }
    .lienzo {
      height: var(--alto-mapa, 300px);
      border-radius: 12px;
      overflow: hidden;
      background: #1a2f57;
      z-index: 0;
    }
    .cargando {
      position: absolute;
      inset: 0;
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #a9c4ee;
    }
  `
})
export class MapaComponent {
  centro = input.required<{ lat: number; lon: number }>();
  zoom = input(12);
  /** Texto del marcador principal (la ubicación elegida) */
  tituloCentro = input('');
  marcadores = input<MarcadorMapa[]>([]);
  etiqueta = input('Mapa interactivo');

  puntoElegido = output<{ lat: number; lon: number }>();

  listo = signal(false);

  private lienzo = viewChild.required<ElementRef<HTMLElement>>('lienzo');
  private L?: typeof Leaflet;
  private mapa?: Leaflet.Map;
  private capaMarcadores?: Leaflet.LayerGroup;
  private marcadorCentro?: Leaflet.CircleMarker;

  constructor() {
    // Leaflet usa window: se carga solo en el navegador y bajo demanda
    afterNextRender(async () => {
      const modulo = await import('leaflet');
      // Según el empaquetador, Leaflet llega como módulo o como export por defecto
      this.L = ((modulo as { default?: typeof Leaflet }).default ?? modulo) as typeof Leaflet;
      const { lat, lon } = this.centro();
      this.mapa = this.L.map(this.lienzo().nativeElement, { scrollWheelZoom: false }).setView([lat, lon], this.zoom());
      this.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(this.mapa);
      this.capaMarcadores = this.L.layerGroup().addTo(this.mapa);
      this.mapa.on('click', (e: Leaflet.LeafletMouseEvent) =>
        this.puntoElegido.emit({ lat: Number(e.latlng.lat.toFixed(4)), lon: Number(e.latlng.lng.toFixed(4)) })
      );
      this.listo.set(true);
    });

    // Al cambiar el centro se mueve el mapa y el marcador principal
    effect(() => {
      const { lat, lon } = this.centro();
      const titulo = this.tituloCentro();
      if (!this.listo() || !this.L || !this.mapa) return;
      this.mapa.setView([lat, lon], Math.max(this.mapa.getZoom(), this.zoom()));
      this.marcadorCentro?.remove();
      this.marcadorCentro = this.L.circleMarker([lat, lon], {
        radius: 9,
        color: '#fff',
        weight: 3,
        fillColor: '#ff5a5f',
        fillOpacity: 1,
        bubblingMouseEvents: false
      })
        .bindTooltip(titulo || 'Ubicación elegida')
        .addTo(this.mapa);
    });

    // Marcadores de los lugares turísticos
    effect(() => {
      const marcadores = this.marcadores();
      if (!this.listo() || !this.L || !this.capaMarcadores) return;
      this.capaMarcadores.clearLayers();
      for (const m of marcadores) {
        const popup = document.createElement('div');
        const titulo = document.createElement('strong');
        titulo.textContent = m.titulo;
        popup.append(titulo);
        if (m.subtitulo) {
          const sub = document.createElement('div');
          sub.textContent = m.subtitulo;
          popup.append(sub);
        }
        if (m.url) {
          const enlace = document.createElement('a');
          enlace.href = m.url;
          enlace.target = '_blank';
          enlace.rel = 'noopener';
          enlace.textContent = 'Wikipedia ↗';
          popup.append(enlace);
        }
        this.L.circleMarker([m.lat, m.lon], {
          radius: 6,
          color: '#14264a',
          weight: 2,
          fillColor: '#ffd166',
          fillOpacity: 0.95,
          // Abrir un marcador no debe contar como clic en el mapa
          bubblingMouseEvents: false
        })
          .bindPopup(popup)
          .addTo(this.capaMarcadores);
      }
    });

    inject(DestroyRef).onDestroy(() => this.mapa?.remove());
  }
}
