# Buscador de Países

Busca países y consulta, para tu ubicación o la de cualquier capital:

- **Ficha por país** (`/pais/jp`): datos generales, países vecinos, hora local, conversor de moneda, feriados y datos prácticos. Se renderiza en el servidor, así que el enlace se puede compartir.
- **Clima** actual y por hora, **calidad del aire** y polen (solo en Europa).
- **Luna**: fase, salida y puesta, y próximas fases. **Estaciones**, equinoccios y solsticios.
- **Cielo nocturno**: planetas visibles, pasos de la Estación Espacial Internacional y próximos eclipses. **Hora dorada y hora azul**.
- **Mapa interactivo**: al tocar un punto, todo se recalcula para esa zona.
- **Lugares turísticos** cercanos (Wikipedia y Wikidata).
- **Comparador** de dos países (`/comparar?a=jp&b=hn`), **quiz** de banderas y capitales, **favoritos** e historial.
- Tema claro y oscuro, e instalable como **PWA** (funciona sin conexión con los datos ya consultados).

Los cálculos astronómicos (fases lunares, eclipses, estaciones y planetas) se hacen en el navegador con los algoritmos de Jean Meeus y los elementos orbitales de JPL; no dependen de ninguna API.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.18.

## Configuración

La API key de restcountries **solo vive en el servidor**: el navegador consulta `/api/paises` y el servidor (`src/server.ts`) hace de intermediario. Antes de ejecutar el proyecto:

```bash
# 1. Variables del servidor: pon tu API key en .env (no se sube a git)
cp .env.example .env

# 2. Environments de Angular (no llevan secretos)
cp src/environments/environment.example.ts src/environments/environment.ts
cp src/environments/environment.example.ts src/environments/environment.development.ts
```

Al publicar en un dominio propio, agrégalo en `NG_ALLOWED_HOSTS` dentro de `.env` (por ejemplo, `NG_ALLOWED_HOSTS=mi-dominio.com`). Sin eso, Angular no renderiza en el servidor para ese dominio (protección contra SSRF).

Para producción: `npm run build` y luego `npm run serve:ssr:prueba` (puerto 4000, o el de la variable `PORT`). El service worker de la PWA solo se activa en producción.

Las demás APIs son gratuitas y no necesitan key: Open-Meteo (clima y aire), BigDataCloud (ubicación), Wikipedia/Wikidata (lugares), OpenStreetMap (mapa), open.er-api.com (monedas), Nager.Date (feriados) y wheretheiss.at o CelesTrak (órbita de la Estación Espacial).

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
