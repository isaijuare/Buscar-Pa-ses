/**
 * Minerales de la sección Entretenimiento. Para agregar uno, suma un objeto a MINERALES:
 * la página, los filtros y la escala de Mohs se arman solos.
 */

export type Categoria = 'Gema' | 'Metálico' | 'Industrial';

export interface Mineral {
  id: string;
  nombre: string;
  formula: string;
  categoria: Categoria;
  /** Clase química (grupo de minerales al que pertenece) */
  clase: string;
  sistema: string;
  /** Dureza en la escala de Mohs: [mínima, máxima] */
  dureza: [number, number];
  /** g/cm³ */
  densidad: string;
  brillo: string;
  color: string;
  /** Color del polvo al rayarlo sobre porcelana */
  raya: string;
  formacion: string;
  origen: string;
  /** Países donde se encuentran ejemplares o yacimientos destacados (código ISO de 2 letras) */
  paises: { codigo: string; nombre: string }[];
  dato: string;
  /** Artículo de Wikipedia en español (y, si es otro, el título del que se toma la foto) */
  wikipedia: string;
  fotoDe?: string;
  /** Color representativo: tiñe la tarjeta y la ilustración si no hay foto */
  tono: string;
}

export const ESCALA_MOHS = [
  'Talco',
  'Yeso',
  'Calcita',
  'Fluorita',
  'Apatito',
  'Ortoclasa',
  'Cuarzo',
  'Topacio',
  'Corindón',
  'Diamante'
];

export const MINERALES: Mineral[] = [
  {
    id: 'cuarzo',
    nombre: 'Cuarzo',
    formula: 'SiO₂',
    categoria: 'Gema',
    clase: 'Silicato',
    sistema: 'Trigonal',
    dureza: [7, 7],
    densidad: '2,65',
    brillo: 'Vítreo',
    color: 'Incoloro, blanco, morado (amatista), rosado, amarillo (citrino) o ahumado',
    raya: 'Blanca',
    formacion:
      'Cristaliza al enfriarse magmas ricos en sílice, como el que forma el granito, y también a partir de agua ' +
      'caliente cargada de sílice que circula por grietas, donde crecen vetas y geodas.',
    origen:
      'Está en casi todas las rocas de la corteza: es uno de los minerales más abundantes del planeta. ' +
      'Hay cristales famosos de Brasil, Madagascar, Arkansas (Estados Unidos) y los Alpes.',
    paises: [
      { codigo: 'BR', nombre: 'Brasil' },
      { codigo: 'MG', nombre: 'Madagascar' },
      { codigo: 'US', nombre: 'Estados Unidos' },
      { codigo: 'CH', nombre: 'Suiza' }
    ],
    dato: 'Es piezoeléctrico: al presionarlo genera electricidad. Por eso un cristal de cuarzo marca el tiempo en los relojes.',
    wikipedia: 'Cuarzo',
    tono: '#c4b5fd'
  },
  {
    id: 'diamante',
    nombre: 'Diamante',
    formula: 'C',
    categoria: 'Gema',
    clase: 'Elemento nativo',
    sistema: 'Cúbico',
    dureza: [10, 10],
    densidad: '3,52',
    brillo: 'Adamantino',
    color: 'Incoloro, amarillo o marrón; rara vez azul, rosado o verde',
    raya: 'No deja raya (es más duro que la porcelana)',
    formacion:
      'Se forma en el manto terrestre, entre 140 y 190 km de profundidad, con presiones enormes y más de 1.000 °C. ' +
      'Erupciones volcánicas que nacen muy hondo (kimberlitas) lo suben rápido a la superficie.',
    origen:
      'Los grandes yacimientos están en rocas muy antiguas de Rusia (Siberia), Botsuana, Canadá, ' +
      'la República Democrática del Congo, Australia y Sudáfrica.',
    paises: [
      { codigo: 'RU', nombre: 'Rusia' },
      { codigo: 'BW', nombre: 'Botsuana' },
      { codigo: 'CA', nombre: 'Canadá' },
      { codigo: 'CD', nombre: 'R. D. del Congo' },
      { codigo: 'ZA', nombre: 'Sudáfrica' }
    ],
    dato:
      'Es el mineral natural más duro y conduce el calor unas cinco veces mejor que el cobre. ' +
      'Muchos diamantes tienen entre 1.000 y 3.500 millones de años.',
    wikipedia: 'Diamante',
    tono: '#e0f2fe'
  },
  {
    id: 'grafito',
    nombre: 'Grafito',
    formula: 'C',
    categoria: 'Industrial',
    clase: 'Elemento nativo',
    sistema: 'Hexagonal',
    dureza: [1, 2],
    densidad: '2,2',
    brillo: 'Metálico a terroso',
    color: 'Gris acero a negro',
    raya: 'Gris negruzca, brillante',
    formacion:
      'Aparece cuando restos de plantas y otra materia orgánica atrapada en las rocas sufren calor y presión ' +
      '(metamorfismo). También cristaliza en algunas rocas ígneas.',
    origen:
      'China es el mayor productor. También hay yacimientos importantes en Brasil, Mozambique y Madagascar, ' +
      'y en Sri Lanka se encuentran vetas de gran pureza.',
    paises: [
      { codigo: 'CN', nombre: 'China' },
      { codigo: 'BR', nombre: 'Brasil' },
      { codigo: 'MZ', nombre: 'Mozambique' },
      { codigo: 'LK', nombre: 'Sri Lanka' }
    ],
    dato:
      'Es carbono, igual que el diamante, pero sus átomos forman capas que se deslizan: por eso es tan blando y ' +
      'deja marca en el papel. La "mina" de los lápices es grafito mezclado con arcilla.',
    wikipedia: 'Grafito',
    tono: '#6b7280'
  },
  {
    id: 'pirita',
    nombre: 'Pirita',
    formula: 'FeS₂',
    categoria: 'Metálico',
    clase: 'Sulfuro',
    sistema: 'Cúbico',
    dureza: [6, 6.5],
    densidad: '5,0',
    brillo: 'Metálico',
    color: 'Amarillo latón',
    raya: 'Negra verdosa',
    formacion:
      'Precipita de fluidos hidrotermales calientes ricos en hierro y azufre, y también en sedimentos sin oxígeno, ' +
      'donde las bacterias producen el azufre que necesita.',
    origen:
      'Es común en todo el mundo. Los cubos casi perfectos de Navajún (La Rioja, España) son famosos, ' +
      'igual que los ejemplares de Perú y de la isla de Elba, en Italia.',
    paises: [
      { codigo: 'ES', nombre: 'España' },
      { codigo: 'PE', nombre: 'Perú' },
      { codigo: 'IT', nombre: 'Italia' }
    ],
    dato:
      'La llaman "oro de los tontos" por su color. Su nombre viene del griego pyr, "fuego": al golpearla con acero saca chispas.',
    wikipedia: 'Pirita',
    tono: '#d4a017'
  },
  {
    id: 'calcita',
    nombre: 'Calcita',
    formula: 'CaCO₃',
    categoria: 'Industrial',
    clase: 'Carbonato',
    sistema: 'Trigonal',
    dureza: [3, 3],
    densidad: '2,71',
    brillo: 'Vítreo',
    color: 'Incolora o blanca; también miel, rosada, verde o azul',
    raya: 'Blanca',
    formacion:
      'Se forma sobre todo en el mar: conchas y esqueletos de organismos se acumulan y forman caliza. ' +
      'También precipita del agua en cuevas (estalactitas y estalagmitas) y en vetas hidrotermales.',
    origen:
      'Está en todo el mundo, en la caliza y el mármol. Los cristales transparentes de Islandia y los de ' +
      'Chihuahua (México) son de los más conocidos.',
    paises: [
      { codigo: 'IS', nombre: 'Islandia' },
      { codigo: 'MX', nombre: 'México' }
    ],
    dato:
      'Un cristal transparente (espato de Islandia) duplica las imágenes: puesto sobre un texto, ves las letras dos veces. ' +
      'Además hace burbujas al contacto con un ácido.',
    wikipedia: 'Calcita',
    tono: '#fde68a'
  },
  {
    id: 'halita',
    nombre: 'Halita',
    formula: 'NaCl',
    categoria: 'Industrial',
    clase: 'Haluro',
    sistema: 'Cúbico',
    dureza: [2, 2.5],
    densidad: '2,17',
    brillo: 'Vítreo',
    color: 'Incolora o blanca; a veces azul, rosada o naranja',
    raya: 'Blanca',
    formacion:
      'Cristaliza cuando se evapora el agua de mares y lagos salados en climas secos. Capas enterradas ' +
      'hace millones de años forman hoy grandes minas de sal.',
    origen:
      'El Salar de Uyuni (Bolivia), la mina de Wieliczka (Polonia), el mar Muerto y la mina de Khewra (Pakistán) ' +
      'son algunos de los lugares más famosos.',
    paises: [
      { codigo: 'BO', nombre: 'Bolivia' },
      { codigo: 'PL', nombre: 'Polonia' },
      { codigo: 'JO', nombre: 'Jordania' },
      { codigo: 'PK', nombre: 'Pakistán' }
    ],
    dato: 'Es la sal de mesa. En la mina de Wieliczka, en Polonia, tallaron una capilla entera en la sal, con lámparas incluidas.',
    wikipedia: 'Halita',
    tono: '#fbcfe8'
  },
  {
    id: 'yeso',
    nombre: 'Yeso',
    formula: 'CaSO₄·2H₂O',
    categoria: 'Industrial',
    clase: 'Sulfato',
    sistema: 'Monoclínico',
    dureza: [2, 2],
    densidad: '2,3',
    brillo: 'Vítreo a sedoso o nacarado',
    color: 'Incoloro o blanco; también gris o miel',
    raya: 'Blanca',
    formacion:
      'Precipita al evaporarse el agua de mar o de lagos, igual que la halita. También se forma cuando aguas ácidas ' +
      'reaccionan con la caliza.',
    origen:
      'La Cueva de los Cristales de Naica (Chihuahua, México) guarda los cristales más grandes conocidos. España es ' +
      'gran productora y las dunas blancas de White Sands (Estados Unidos) son de yeso.',
    paises: [
      { codigo: 'MX', nombre: 'México' },
      { codigo: 'ES', nombre: 'España' },
      { codigo: 'US', nombre: 'Estados Unidos' }
    ],
    dato: 'En Naica hay cristales de yeso de hasta 12 metros de largo. Es tan blando que se raya con la uña.',
    wikipedia: 'Yeso (mineral)',
    fotoDe: 'Yeso',
    tono: '#f5f5f4'
  },
  {
    id: 'fluorita',
    nombre: 'Fluorita',
    formula: 'CaF₂',
    categoria: 'Industrial',
    clase: 'Haluro',
    sistema: 'Cúbico',
    dureza: [4, 4],
    densidad: '3,18',
    brillo: 'Vítreo',
    color: 'Morado, verde, azul, amarillo o incoloro, a menudo en bandas',
    raya: 'Blanca',
    formacion:
      'Cristaliza en vetas a partir de fluidos hidrotermales calientes que llevan flúor, muchas veces junto a ' +
      'minerales de plomo y zinc.',
    origen:
      'China y México son los mayores productores. En Derbyshire (Inglaterra) se extrae desde hace siglos una variedad ' +
      'con bandas moradas y amarillas llamada Blue John.',
    paises: [
      { codigo: 'CN', nombre: 'China' },
      { codigo: 'MX', nombre: 'México' },
      { codigo: 'GB', nombre: 'Reino Unido' }
    ],
    dato: 'Muchas brillan bajo la luz ultravioleta. La palabra "fluorescencia" viene precisamente de su nombre.',
    wikipedia: 'Fluorita',
    tono: '#a78bfa'
  },
  {
    id: 'malaquita',
    nombre: 'Malaquita',
    formula: 'Cu₂CO₃(OH)₂',
    categoria: 'Gema',
    clase: 'Carbonato',
    sistema: 'Monoclínico',
    dureza: [3.5, 4],
    densidad: '4,0',
    brillo: 'Sedoso a vítreo',
    color: 'Verde intenso, con bandas claras y oscuras',
    raya: 'Verde claro',
    formacion:
      'Se forma cerca de la superficie, cuando el agua y el aire alteran yacimientos de cobre: el cobre se combina ' +
      'con carbonatos y crece en capas, como los anillos de un árbol.',
    origen:
      'Los mejores ejemplares vienen de la República Democrática del Congo, Zambia, los montes Urales (Rusia) y Australia.',
    paises: [
      { codigo: 'CD', nombre: 'R. D. del Congo' },
      { codigo: 'ZM', nombre: 'Zambia' },
      { codigo: 'RU', nombre: 'Rusia' },
      { codigo: 'AU', nombre: 'Australia' }
    ],
    dato:
      'Molida se usó como pigmento verde desde el antiguo Egipto. En el Palacio de Invierno de San Petersburgo hay un ' +
      'salón entero decorado con malaquita de los Urales.',
    wikipedia: 'Malaquita',
    tono: '#10b981'
  },
  {
    id: 'turquesa',
    nombre: 'Turquesa',
    formula: 'CuAl₆(PO₄)₄(OH)₈·4H₂O',
    categoria: 'Gema',
    clase: 'Fosfato',
    sistema: 'Triclínico',
    dureza: [5, 6],
    densidad: '2,6 a 2,9',
    brillo: 'Céreo',
    color: 'Azul cielo a verde, a veces con vetas oscuras',
    raya: 'Blanca a verdosa',
    formacion:
      'Nace en zonas áridas: durante millones de años el agua de lluvia se filtra por rocas con cobre y aluminio, ' +
      'y deposita el mineral en grietas y huecos.',
    origen:
      'Irán (minas de Nishapur), el suroeste de Estados Unidos (Arizona, Nevada, Nuevo México), la península del Sinaí ' +
      '(Egipto) y China.',
    paises: [
      { codigo: 'IR', nombre: 'Irán' },
      { codigo: 'US', nombre: 'Estados Unidos' },
      { codigo: 'EG', nombre: 'Egipto' },
      { codigo: 'CN', nombre: 'China' }
    ],
    dato:
      'Los antiguos egipcios ya la extraían en el Sinaí hace unos 5.000 años, y los pueblos del suroeste de ' +
      'Norteamérica la usan en su joyería desde hace siglos.',
    wikipedia: 'Turquesa',
    tono: '#2dd4bf'
  },
  {
    id: 'olivino',
    nombre: 'Olivino',
    formula: '(Mg,Fe)₂SiO₄',
    categoria: 'Gema',
    clase: 'Silicato',
    sistema: 'Ortorrómbico',
    dureza: [6.5, 7],
    densidad: '3,2 a 4,4',
    brillo: 'Vítreo',
    color: 'Verde oliva a verde amarillento',
    raya: 'Blanca',
    formacion:
      'Es uno de los minerales principales del manto terrestre. Cristaliza en magmas pobres en sílice y llega a la ' +
      'superficie dentro de los basaltos.',
    origen:
      'Hay peridotos de calidad en San Carlos (Arizona, Estados Unidos), la isla de Zabargad (Egipto) y Pakistán. ' +
      'En Hawái, la playa de Papakōlea es verde por los granos de olivino.',
    paises: [
      { codigo: 'US', nombre: 'Estados Unidos' },
      { codigo: 'EG', nombre: 'Egipto' },
      { codigo: 'PK', nombre: 'Pakistán' }
    ],
    dato: 'Su variedad gema se llama peridoto. También se ha encontrado en meteoritos y en la superficie de Marte.',
    wikipedia: 'Olivino',
    tono: '#a3e635'
  },
  {
    id: 'corindon',
    nombre: 'Corindón',
    formula: 'Al₂O₃',
    categoria: 'Gema',
    clase: 'Óxido',
    sistema: 'Trigonal',
    dureza: [9, 9],
    densidad: '4,0',
    brillo: 'Vítreo a adamantino',
    color: 'Incoloro, gris o marrón; rojo (rubí) y azul u otros colores (zafiro)',
    raya: 'Blanca',
    formacion:
      'Se forma en rocas metamórficas y en algunos magmas pobres en sílice, donde sobra aluminio. Como es tan ' +
      'resistente, se acumula en la arena de los ríos.',
    origen:
      'Los rubíes más famosos vienen de Mogok (Myanmar); los zafiros, de Sri Lanka, Madagascar y Tailandia.',
    paises: [
      { codigo: 'MM', nombre: 'Myanmar' },
      { codigo: 'LK', nombre: 'Sri Lanka' },
      { codigo: 'MG', nombre: 'Madagascar' },
      { codigo: 'TH', nombre: 'Tailandia' }
    ],
    dato:
      'El rubí y el zafiro son el mismo mineral: el rojo se debe al cromo y el azul, al hierro y el titanio. ' +
      'En la escala de Mohs solo lo supera el diamante.',
    wikipedia: 'Corindón',
    tono: '#f43f5e'
  },
  {
    id: 'magnetita',
    nombre: 'Magnetita',
    formula: 'Fe₃O₄',
    categoria: 'Metálico',
    clase: 'Óxido',
    sistema: 'Cúbico',
    dureza: [5.5, 6.5],
    densidad: '5,2',
    brillo: 'Metálico',
    color: 'Negro',
    raya: 'Negra',
    formacion:
      'Cristaliza en magmas al enfriarse y en rocas metamórficas. Al erosionarse esas rocas, forma las arenas negras ' +
      'de muchas playas y ríos.',
    origen:
      'Es una de las principales menas de hierro. La mina de Kiruna, en Suecia, es una de las más grandes del mundo, ' +
      'y en Sudáfrica hay enormes capas de magnetita.',
    paises: [
      { codigo: 'SE', nombre: 'Suecia' },
      { codigo: 'ZA', nombre: 'Sudáfrica' }
    ],
    dato:
      'Es el mineral natural más magnético: atrae clips y mueve la aguja de una brújula. Algunas bacterias fabrican ' +
      'diminutos cristales de magnetita para orientarse.',
    wikipedia: 'Magnetita',
    tono: '#94a3b8'
  },
  {
    id: 'oro',
    nombre: 'Oro',
    formula: 'Au',
    categoria: 'Metálico',
    clase: 'Elemento nativo',
    sistema: 'Cúbico',
    dureza: [2.5, 3],
    densidad: '19,3',
    brillo: 'Metálico',
    color: 'Amarillo dorado',
    raya: 'Amarilla dorada',
    formacion:
      'Se deposita en vetas de cuarzo a partir de fluidos hidrotermales muy calientes. Cuando esas rocas se ' +
      'erosionan, las pepitas se acumulan en el fondo de los ríos (placeres).',
    origen:
      'La cuenca de Witwatersrand (Sudáfrica) es el yacimiento más rico de la historia. Hoy los mayores productores ' +
      'son China, Australia y Rusia; en América destaca Perú.',
    paises: [
      { codigo: 'ZA', nombre: 'Sudáfrica' },
      { codigo: 'CN', nombre: 'China' },
      { codigo: 'AU', nombre: 'Australia' },
      { codigo: 'RU', nombre: 'Rusia' },
      { codigo: 'PE', nombre: 'Perú' }
    ],
    dato: 'Es tan maleable que con un solo gramo se puede hacer una lámina de casi un metro cuadrado. Además, no se oxida.',
    wikipedia: 'Oro',
    tono: '#facc15'
  }
];
