import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // El inicio no depende de datos del servidor: se genera una vez al compilar
  { path: '', renderMode: RenderMode.Prerender },
  // La ficha de cada país se renderiza en el servidor con sus datos (enlaces compartibles y SEO)
  { path: 'pais/:codigo', renderMode: RenderMode.Server },
  // Comparador y quiz dependen de lo que elija el usuario: se arman en el navegador
  { path: 'comparar', renderMode: RenderMode.Client },
  { path: 'quiz', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Server }
];
