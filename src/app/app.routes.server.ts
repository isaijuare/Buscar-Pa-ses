import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // El inicio no depende de datos del servidor: se genera una vez al compilar
  { path: '', renderMode: RenderMode.Prerender },
  // La ficha de cada país se renderiza en el servidor con sus datos (enlaces compartibles y SEO)
  { path: 'pais/:codigo', renderMode: RenderMode.Server },
  // Comparador y quiz dependen de lo que elija el usuario: se arman en el navegador
  { path: 'comparar', renderMode: RenderMode.Client },
  { path: 'quiz', renderMode: RenderMode.Client },
  // La sesión se guarda en el navegador: el login se arma ahí
  { path: 'login', renderMode: RenderMode.Client },
  { path: 'perfil', renderMode: RenderMode.Client },
  // Páginas de la barra superior: su contenido no cambia, se generan al compilar
  { path: 'nosotros', renderMode: RenderMode.Prerender },
  { path: 'que-hacemos', renderMode: RenderMode.Prerender },
  { path: 'servicios', renderMode: RenderMode.Prerender },
  { path: 'entretenimiento', renderMode: RenderMode.Prerender },
  { path: 'contacto', renderMode: RenderMode.Prerender },
  // Los minerales son datos fijos: se generan al compilar (las fotos llegan después, desde Wikipedia)
  { path: 'minerales', renderMode: RenderMode.Prerender },
  // Juegos y mapas se arman en el navegador (azar, récords guardados y Leaflet)
  { path: 'juegos/estaciones', renderMode: RenderMode.Client },
  { path: 'juegos/memoria', renderMode: RenderMode.Client },
  { path: 'mapas', renderMode: RenderMode.Client },
  { path: 'mapas/:codigo', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server }
];
