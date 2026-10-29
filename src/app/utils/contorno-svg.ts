import { ContornoPais, poligonos } from '../models/contorno';

export interface SiluetaSvg {
  /** Atributo d del <path> con todo el país */
  d: string;
  ancho: number;
  alto: number;
}

/**
 * Dibuja el contorno como un path SVG. Proyección equirectangular corregida por la latitud media:
 * sencilla y suficiente para ver la forma de un país (no para medir distancias).
 */
export function silueta(contorno: ContornoPais, ancho = 800, margen = 16): SiluetaSvg {
  const [oeste, sur, este, norte] = contorno.caja;
  const factorLon = Math.cos((((sur + norte) / 2) * Math.PI) / 180);
  const anchoGeo = Math.max((este - oeste) * factorLon, 1e-6);
  const altoGeo = Math.max(norte - sur, 1e-6);

  const escala = (ancho - margen * 2) / anchoGeo;
  const alto = Math.round(altoGeo * escala + margen * 2);
  const x = (lon: number) => ((lon - oeste) * factorLon * escala + margen).toFixed(1);
  const y = (lat: number) => ((norte - lat) * escala + margen).toFixed(1);

  const d = poligonos(contorno.geometria)
    .flatMap((anillos) => anillos)
    .map((anillo) => 'M' + anillo.map(([lon, lat]) => `${x(lon)},${y(lat)}`).join('L') + 'Z')
    .join('');
  return { d, ancho, alto };
}

/** Archivo SVG completo, listo para descargar (con fondo, nombre y créditos de OpenStreetMap). */
export function archivoSvg(contorno: ContornoPais, colores = { fondo: '#1a1d21', pais: '#2dd4bf', borde: '#5eead4', texto: '#e6e8eb' }): string {
  const { d, ancho, alto } = silueta(contorno, 1200, 40);
  const altoTotal = alto + 90;
  const nombre = escaparXml(contorno.nombre);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${altoTotal}" viewBox="0 0 ${ancho} ${altoTotal}">
  <title>Mapa de ${nombre}</title>
  <rect width="100%" height="100%" fill="${colores.fondo}"/>
  <text x="40" y="56" font-family="system-ui, sans-serif" font-size="34" font-weight="700" fill="${colores.texto}">${nombre}</text>
  <g transform="translate(0 70)">
    <path d="${d}" fill="${colores.pais}" fill-rule="evenodd" stroke="${colores.borde}" stroke-width="1.5" stroke-linejoin="round"/>
  </g>
  <text x="${ancho - 40}" y="${altoTotal - 16}" text-anchor="end" font-family="system-ui, sans-serif" font-size="14" fill="${colores.texto}" opacity="0.6">Frontera: © colaboradores de OpenStreetMap · Tu Clima</text>
</svg>`;
}

/** Convierte el SVG en PNG dibujándolo en un canvas (todo ocurre en el navegador). */
export async function archivoPng(svg: string): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const imagen = new Image();
    imagen.src = url;
    await imagen.decode();
    const lienzo = document.createElement('canvas');
    lienzo.width = imagen.naturalWidth;
    lienzo.height = imagen.naturalHeight;
    lienzo.getContext('2d')!.drawImage(imagen, 0, 0);
    return await new Promise<Blob>((resolver, rechazar) =>
      lienzo.toBlob((b) => (b ? resolver(b) : rechazar(new Error('No se pudo crear la imagen'))), 'image/png')
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Hace que el navegador descargue el archivo. */
export function descargar(contenido: Blob | string, nombreArchivo: string, tipo = 'image/svg+xml'): void {
  const blob = typeof contenido === 'string' ? new Blob([contenido], { type: tipo }) : contenido;
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escaparXml(texto: string): string {
  return texto.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
