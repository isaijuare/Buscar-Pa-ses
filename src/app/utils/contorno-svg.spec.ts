import { archivoSvg, silueta } from './contorno-svg';
import { ContornoPais } from '../models/contorno';

// Un "país" cuadrado de 10° x 10° en el ecuador, con una isla aparte
const CUADRADO: ContornoPais = {
  codigo: 'XX',
  nombre: 'Tierra <de> Prueba',
  geometria: {
    type: 'MultiPolygon',
    coordinates: [
      [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
      [[[12, 0], [13, 0], [13, 1], [12, 0]]]
    ]
  },
  caja: [0, 0, 13, 10]
};

describe('silueta del mapa', () => {
  it('dibuja un trazo cerrado por cada polígono', () => {
    const { d } = silueta(CUADRADO, 800, 0);
    expect(d.match(/M/g)).toHaveLength(2);
    expect(d.match(/Z/g)).toHaveLength(2);
  });

  it('respeta las proporciones del país', () => {
    const { ancho, alto } = silueta(CUADRADO, 1300, 0);
    // 13° de ancho por 10° de alto cerca del ecuador
    expect(alto / ancho).toBeCloseTo(10 / 13, 1);
  });

  it('el norte queda arriba', () => {
    const { d } = silueta(CUADRADO, 800, 0);
    const [, primerY] = d.slice(1).split('L')[0].split(',').map(Number);
    // El primer punto es (0°, 0°): el borde sur, abajo del dibujo
    expect(primerY).toBeGreaterThan(500);
  });

  it('el archivo SVG escapa el nombre del país', () => {
    const svg = archivoSvg(CUADRADO);
    expect(svg).toContain('Tierra &#60;de&#62; Prueba');
    expect(svg).not.toContain('<de>');
    expect(svg).toContain('OpenStreetMap');
  });
});
