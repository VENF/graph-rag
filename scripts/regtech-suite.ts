import { app } from '../src/modules/search/index.js';

type TestCase = {
  rubro: string;
  descripcion_comercial: string;
  uso_previsto: string;
  expectedChapters: number[];
  expectedMaterialPattern?: RegExp;
  expectedNamePattern?: RegExp;
};

type Result = {
  rubro: string;
  technicalName: string;
  constituentMaterial: string;
  chapter: number;
  expectedChapters: string;
  materialOk: boolean;
  chapterOk: boolean;
  error?: string;
};

const testCases: TestCase[] = [
  {
    rubro: 'I: Animales vivos',
    descripcion_comercial:
      'Filetes Premium de Salmón del Atlántico chileno, corte mariposa, congelados individualmente en empaque al vacío de 500g, listos para cocinar.',
    uso_previsto: 'Consumo humano directo en cadenas de restaurantes y supermercados.',
    expectedChapters: [3],
    expectedMaterialPattern: /carne|pescado|músculo|tejido/i,
    expectedNamePattern: /salmón|pescado|filete/i,
  },
  {
    rubro: 'II: Reino vegetal',
    descripcion_comercial:
      'Café Gold Selección Especial, granos tostados enteros de la variedad Arábica, empaque aluminizado con válvula desgasificadora.',
    uso_previsto: 'Molienda e infusión para consumo como bebida estimulante.',
    expectedChapters: [9],
    expectedMaterialPattern: /grano|semilla|café|vegetal/i,
    expectedNamePattern: /café/i,
  },
  {
    rubro: 'III: Grasas y aceites',
    descripcion_comercial:
      'Aceite de Oliva Extra Virgen Orgánico prensado en frío, acidez menor a 0.5%, presentación en botella de vidrio oscuro de 750ml.',
    uso_previsto: 'Aderezo culinario y preparación de alimentos.',
    expectedChapters: [15],
    expectedMaterialPattern: /lípido|aceite|grasa|vegetal|oliva/i,
    expectedNamePattern: /aceite/i,
  },
  {
    rubro: 'IV: Industrias alimentarias',
    descripcion_comercial:
      'Cereal Fitness Crujiente con trozos de fresa deshidratada y hojuelas de avena integral fortificado con vitaminas y hierro.',
    uso_previsto: 'Alimento balanceado para desayuno de consumo directo.',
    expectedChapters: [19],
    expectedMaterialPattern: /cereal|avena|grano|preparación.*aliment/i,
    expectedNamePattern: /cereal|preparación/i,
  },
  {
    rubro: 'V: Productos minerales',
    descripcion_comercial:
      'Cemento Portland Gris Tipo I de alta resistencia inicial, sacos de 42.5 kg para obras civiles estructurales.',
    uso_previsto: 'Mezcla de hormigón/concreto para vaciado de fundaciones y columnas.',
    expectedChapters: [25],
    expectedMaterialPattern: /cemento|mineral|calcáreo|hidráulico|cal/i,
    expectedNamePattern: /cemento/i,
  },
  {
    rubro: 'VI: Industrias químicas',
    descripcion_comercial:
      'Amoxicilina Trihidratada USP, polvo cristalino puro micronizado. Lote farmacéutico de grado de pureza 99.8%.',
    uso_previsto: 'Materia prima para la dosificación y fabricación de cápsulas antibióticas en laboratorios.',
    expectedChapters: [29],
    expectedMaterialPattern: /compuesto.*químico|orgánico|polvo.*cristalino|amoxicilina/i,
    expectedNamePattern: /amoxicilina|compuesto|producto.*químico/i,
  },
  {
    rubro: 'VII: Plástico y caucho',
    descripcion_comercial:
      'Manguera reforzada FlexoMax de alta presión con trenzado interno, diámetro 1/2 pulgada, rollos de 50 metros.',
    uso_previsto: 'Conducción de fluidos hidráulicos en sistemas de riego agrícola.',
    expectedChapters: [39],
    expectedMaterialPattern: /plástico|polímero|pvc|caucho|sintético/i,
    expectedNamePattern: /manguera|tubo|plástico/i,
  },
  {
    rubro: 'VIII: Pieles y cueros',
    descripcion_comercial:
      'Maletín Ejecutivo de Lujo Black Edition con compartimento acolchado para laptop y herrajes metálicos.',
    uso_previsto: 'Transporte personal de documentos y equipos de computación portátiles.',
    expectedChapters: [42],
    expectedMaterialPattern: /cuero|piel|curtido/i,
    expectedNamePattern: /maletín|estuche|contenedor|bolso|artículo.*viaje/i,
  },
  {
    rubro: 'IX: Madera y carbón',
    descripcion_comercial:
      'Tableros de Madera MDF texturizados, densidad media, formato 1.22m x 2.44m, espesor 15mm para carpintería moderna.',
    uso_previsto: 'Materia prima para la fabricación de mobiliario residencial de cocina y clósets.',
    expectedChapters: [44],
    expectedMaterialPattern: /madera|fibra|aglomerado|resina|celulosa/i,
    expectedNamePattern: /tablero|madera|panel/i,
  },
  {
    rubro: 'X: Pasta, papel y cartón',
    descripcion_comercial: 'Bobinas de Papel Kraft de alta resistencia, gramaje 80g/m², ancho de rollo 1.20 metros.',
    uso_previsto: 'Fabricación de sacos industriales y envoltura de empaques protectores.',
    expectedChapters: [48],
    expectedMaterialPattern: /papel|celulosa|fibra/i,
    expectedNamePattern: /papel|bobina|rollo/i,
  },
  {
    rubro: 'XI: Materias textiles',
    descripcion_comercial:
      'Jeans Denim Confort para caballero, corte clásico de 5 bolsillos, costuras reforzadas con remaches.',
    uso_previsto: 'Prenda de vestir de uso diario para protección y abrigo corporal.',
    expectedChapters: [62],
    expectedMaterialPattern: /textil|fibra|algodón|denim|tejido/i,
    expectedNamePattern: /pantalón|jeans|prenda|vestir/i,
  },
  {
    rubro: 'XII: Calzado',
    descripcion_comercial:
      'Botas de Seguridad Industrial IronClad con puntera de protección contra impactos, suela antideslizante dieléctrica.',
    uso_previsto: 'Equipo de protección personal para trabajadores en plantas industriales y obras civiles.',
    expectedChapters: [64],
    expectedMaterialPattern: /calzado|bota|zapato|suela/i,
    expectedNamePattern: /calzado|bota|zapato/i,
  },
  {
    rubro: 'XIII: Cerámica y vidrio',
    descripcion_comercial:
      'Porcelanato Pulido Rectificado de alto tráfico, formato 60x60cm, color beige marfil para pisos de áreas comerciales.',
    uso_previsto: 'Revestimiento cerámico final para pavimentación de suelos internos.',
    expectedChapters: [69],
    expectedMaterialPattern: /cerámica|arcilla|porcelanato|vitrificado/i,
    expectedNamePattern: /porcelanato|baldosa|revestimiento|cerámico/i,
  },
  {
    rubro: 'XIV: Perlas y metales preciosos',
    descripcion_comercial:
      'Anillos de Compromiso Eternity chapados en oro de 18 quilates sobre base de plata esterlina 925, engastados con circonias cúbicas.',
    uso_previsto: 'Artículo de joyería para adorno personal.',
    expectedChapters: [71],
    expectedMaterialPattern: /plata|metal.*precioso|chapado|oro/i,
    expectedNamePattern: /anillo|joyería|bisutería|adorno/i,
  },
  {
    rubro: 'XV: Metales comunes',
    descripcion_comercial:
      'Vigas de Acero Estructural en I (perfiles IPE 200), longitud estándar de 12 metros, acero al carbono laminado en caliente.',
    uso_previsto: 'Elementos de soporte de carga y esqueletos metálicos en la construcción de edificios.',
    expectedChapters: [72, 73],
    expectedMaterialPattern: /acero|hierro|metal|fundición/i,
    expectedNamePattern: /viga|perfil|acero/i,
  },
  {
    rubro: 'XVI: Máquinas y aparatos',
    descripcion_comercial:
      'Acondicionador de Aire Split Inverter Eco-Save de 12,000 BTU/h, refrigerante ecológico R410A, unidad interna y externa.',
    uso_previsto: 'Climatización y control de temperatura/humedad en habitaciones residenciales u oficinas.',
    expectedChapters: [84],
    expectedMaterialPattern: /electrodoméstico|componente.*eléctrico|aparato.*electromecánico|máquina|aire/i,
    expectedNamePattern: /acondicionador|climatizador|aire/i,
  },
  {
    rubro: 'XVII: Material transporte',
    descripcion_comercial:
      'Camioneta Pickup 4x4 WorkHorse, motor Diésel de 2.8 Litros, cabina doble, capacidad de carga útil homologada de 1.2 toneladas.',
    uso_previsto: 'Transporte mixto de personal técnico y herramientas de trabajo en zonas rurales y faenas mineras.',
    expectedChapters: [87],
    expectedMaterialPattern: /vehículo|automóvil|metal|acero|chasis/i,
    expectedNamePattern: /camioneta|vehículo|pickup|camión/i,
  },
  {
    rubro: 'XVIII: Instrumentos precisión',
    descripcion_comercial:
      'Tensiómetro Digital Automático de Brazo Omron Elite, pantalla digital LCD, memoria para 60 lecturas, brazalete universal.',
    uso_previsto: 'Monitoreo clínico y doméstico de la presión arterial sistólica, diastólica y pulso cardíaco.',
    expectedChapters: [90],
    expectedMaterialPattern: /componente.*electrónico|instrumento|aparato.*médico|plástico/i,
    expectedNamePattern: /tensiómetro|esfigmomanómetro|monitor|instrumento.*médico/i,
  },
  {
    rubro: 'XIX: Armas y municiones',
    descripcion_comercial:
      'Cartuchos de Escopeta Calibre 12 gauge, perdigón número 4, munición de caza menor deportiva, caja de 25 cartuchos.',
    uso_previsto: 'Práctica de tiro al blanco deportivo y actividades reguladas de cacería.',
    expectedChapters: [93],
    expectedMaterialPattern: /explosivo|munic[ióo]n|cápsula|metal.*plástico|carga/i,
    expectedNamePattern: /cartucho|munic[ióo]n|proyectil/i,
  },
  {
    rubro: 'XX: Mercancías diversas',
    descripcion_comercial:
      'Silla Ergonómica Pro-Gaming con respaldo reclinable de cuero sintético, reposabrazos 3D y base de nylon reforzado con ruedas.',
    uso_previsto: 'Asiento de descanso y soporte postural para largas jornadas de trabajo en oficina o videojuegos.',
    expectedChapters: [94],
    expectedMaterialPattern: /plástico|metal|textil|material.*compuesto|sintético/i,
    expectedNamePattern: /silla|asiento|mueble/i,
  },
  {
    rubro: 'XXI: Objetos de arte',
    descripcion_comercial:
      "Pintura al Óleo Original sobre Lienzo titulada 'Atardecer en el llano', año 2024, ejecutada completamente a mano por artista plástico local, enmarcada.",
    uso_previsto: 'Exhibición estética, decoración de interiores y coleccionismo de arte contemporáneo.',
    expectedChapters: [97],
    expectedMaterialPattern: /óleo|pintura|pigmento|lienzo|textil/i,
    expectedNamePattern: /pintura|cuadro|obra/i,
  },
];

function evaluateSuite(results: Result[]): void {
  const total = results.length;
  let nodo1Ok = 0;
  let nodo2Ok = 0;

  console.log(`\n${'─'.repeat(120)}`);
  console.log(
    `${'Rubro'.padEnd(28)} ${'Nombre Técnico'.padEnd(32)} ${'Material (truncado)'.padEnd(34)} ${'Ch'.padEnd(4)} ${'Esp'.padEnd(8)} ${'N1'} ${'N2'}`,
  );
  console.log(`${'─'.repeat(120)}`);

  for (const r of results) {
    const chStr = r.chapter?.toString() ?? 'ERR';
    const matStr = r.constituentMaterial?.slice(0, 32) ?? '—';

    if (r.error) {
      console.log(
        `${r.rubro.padEnd(28)} ${'❌ ERROR:'.padEnd(32)} ${'—'.padEnd(34)} ${'—'.padEnd(4)} ${'—'.padEnd(8)} ❌ ❌`,
      );
      continue;
    }

    if (r.materialOk) nodo1Ok++;
    if (r.chapterOk) nodo2Ok++;

    const n1 = r.materialOk ? '✅' : '❌';
    const n2 = r.chapterOk ? '✅' : '❌';

    console.log(
      `${r.rubro.padEnd(28)} ${r.technicalName.slice(0, 30).padEnd(32)} ${matStr.padEnd(34)} ${chStr.padEnd(4)} ${r.expectedChapters.padEnd(8)} ${n1} ${n2}`,
    );
  }

  console.log(`${'─'.repeat(120)}\n`);

  const nodo1Rate = (nodo1Ok / total) * 100;
  const nodo2Rate = (nodo2Ok / total) * 100;

  console.log(`📊 Nodo 1 (inferencia material): ${nodo1Rate.toFixed(1)}% (${nodo1Ok}/${total})`);
  console.log(`📊 Nodo 2 (enrutamiento): ${nodo2Rate.toFixed(1)}% (${nodo2Ok}/${total})`);
  console.log(`🎯 Objetivo N2 > 95%: ${nodo2Rate > 95 ? '✅ CUMPLE' : '❌ NO CUMPLE'}`);
}

async function main() {
  const results: Result[] = [];

  for (const tc of testCases) {
    try {
      const finalState = await app.invoke({
        inputJson: { producto: { descripcion_comercial: tc.descripcion_comercial, uso_previsto: tc.uso_previsto } },
      });

      const sheet = finalState.technicalSheet as Record<string, unknown> | null;
      const technicalName = (sheet?.technical_name as string) ?? '';
      const constituentMaterial = (sheet?.constituent_material as string) ?? '';
      const chapter = finalState.chapter;

      const materialOk =
        !/No especificado|Desconocido|null|undefined/i.test(constituentMaterial) &&
        constituentMaterial.length > 0 &&
        (tc.expectedMaterialPattern ? tc.expectedMaterialPattern.test(constituentMaterial) : true);

      const chapterOk = tc.expectedChapters.includes(chapter);

      results.push({
        rubro: tc.rubro,
        technicalName,
        constituentMaterial,
        chapter,
        expectedChapters: tc.expectedChapters.join(' | '),
        materialOk,
        chapterOk,
      });
    } catch (err) {
      results.push({
        rubro: tc.rubro,
        technicalName: '',
        constituentMaterial: '',
        chapter: 0,
        expectedChapters: tc.expectedChapters.join(' | '),
        materialOk: false,
        chapterOk: false,
        error: (err as Error).message,
      });
    }
  }

  evaluateSuite(results);
}

main();
