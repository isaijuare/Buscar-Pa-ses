/**
 * Textos de las páginas informativas (barra superior). Edítalos aquí: las páginas se arman solas.
 * Son textos de ejemplo basados en lo que hace la app; cámbialos por los datos reales del proyecto.
 */

export interface Bloque {
  icono: string;
  titulo: string;
  texto: string;
}

export interface PaginaInfo {
  titulo: string;
  entrada: string;
  bloques: Bloque[];
  cierre?: string;
}

export type ClavePagina = 'nosotros' | 'dedicamos' | 'servicios';

export const PAGINAS: Record<ClavePagina, PaginaInfo> = {
  nosotros: {
    titulo: 'Quiénes somos',
    entrada:
      'Tu Clima nació de una idea sencilla: que mirar el cielo y conocer el mundo sea fácil, bonito y para todos. ' +
      'Somos un proyecto independiente hecho con curiosidad por la geografía, la astronomía y el tiempo.',
    bloques: [
      {
        icono: '🌍',
        titulo: 'Nuestra misión',
        texto: 'Acercar a las personas a los datos del clima y de los países del mundo, explicados de forma clara.'
      },
      {
        icono: '🔭',
        titulo: 'Nuestra visión',
        texto: 'Ser el lugar al que vuelves cada día para saber qué pasa en tu cielo y descubrir uno nuevo.'
      },
      {
        icono: '🤝',
        titulo: 'Nuestros valores',
        texto: 'Información abierta, diseño accesible y respeto por tu privacidad: tus datos son tuyos.'
      }
    ]
  },
  dedicamos: {
    titulo: 'A qué nos dedicamos',
    entrada:
      'Reunimos en un solo lugar información que normalmente está dispersa: el clima, el cielo, las estaciones ' +
      'y los datos de cada país, siempre actualizados.',
    bloques: [
      {
        icono: '🌦️',
        titulo: 'Clima en tiempo real',
        texto: 'Temperatura, pronóstico por hora, calidad del aire y horas de sol para cualquier punto del mapa.'
      },
      {
        icono: '🌙',
        titulo: 'Astronomía cotidiana',
        texto: 'Fases de la Luna, el cielo nocturno y la Estación Espacial Internacional, vistos desde donde estés.'
      },
      {
        icono: '🗺️',
        titulo: 'Países del mundo',
        texto: 'Fichas con población, idiomas, monedas, lugares turísticos y datos útiles para viajar.'
      },
      {
        icono: '🎓',
        titulo: 'Aprender jugando',
        texto: 'Juegos y quizzes para poner a prueba lo que sabes de geografía y de la naturaleza.'
      }
    ]
  },
  servicios: {
    titulo: 'Servicios',
    entrada: 'Todo lo que puedes hacer en Tu Clima, sin costo.',
    bloques: [
      {
        icono: '🔎',
        titulo: 'Buscador de países',
        texto: 'Encuentra cualquier país por su nombre en español, en inglés o por su código (jp, usa).'
      },
      {
        icono: '⚖️',
        titulo: 'Comparador',
        texto: 'Pon dos países lado a lado y compara su población, superficie, clima y más.'
      },
      {
        icono: '⭐',
        titulo: 'Favoritos en tu cuenta',
        texto: 'Guarda tus países favoritos y tus récords; los verás en cualquier dispositivo al iniciar sesión.'
      },
      {
        icono: '📍',
        titulo: 'Tu cielo ahora',
        texto: 'Toca cualquier punto del mapa y mira su clima, su cielo y los lugares turísticos cercanos.'
      }
    ],
    cierre: '¿Te gustaría que agreguemos algo? Escríbenos desde la página de contacto.'
  }
};
