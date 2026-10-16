// Plantilla: copiar como environment.ts y environment.development.ts y poner la API key real.
// Esos dos archivos están en .gitignore para que la key no se suba al repositorio.
export const environment = {
  production: false,
  restCountriesApiUrl: 'https://api.restcountries.com/countries/v5',
  restCountriesApiKey: 'TU_API_KEY'
};
