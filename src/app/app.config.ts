import { ApplicationConfig, REQUEST, inject, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { HttpInterceptorFn, provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';

// En el servidor (SSR) las rutas relativas como /api/paises necesitan el dominio de la petición
const urlAbsolutaEnServidor: HttpInterceptorFn = (req, next) => {
  const peticion = inject(REQUEST, { optional: true });
  if (peticion && req.url.startsWith('/')) {
    return next(req.clone({ url: new URL(req.url, peticion.url).toString() }));
  }
  return next(req);
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: los parámetros de la URL llegan como inputs (p. ej. /pais/:codigo)
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })
    ),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([urlAbsolutaEnServidor])),
    // PWA: se puede instalar y abrir sin conexión (solo en producción)
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
