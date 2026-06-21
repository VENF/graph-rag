export const isMock = () => process.env.MOCK_MODE === 'true';

export const MOCK_TECHNICAL_SHEET = {
  technical_name: 'Teléfono móvil celular inteligente',
  constituent_material: 'Componentes electrónicos ensamblados con elementos de metal, plástico y vidrio',
  primary_function: 'Telecomunicación celular de voz y datos en redes inalámbricas',
  physical_presentation:
    'Dispositivo terminado, acondicionado para la venta al por menor, listo para su funcionamiento autónomo',
  critical_specifications: {
    network_technology: 'Celular inalámbrica (5G)',
    power_source: 'Batería recargable integrada',
  },
};

export const MOCK_CHAPTER = 85;

export const MOCK_CHAPTER_EXPLANATION =
  'El producto (teléfono inteligente) se clasifica en el Capítulo 85 por aplicación de la RGI 1, ya que la Sección XVI (Capítulos 84-85) abarca máquinas, aparatos y material eléctrico. La Nota 5 del Capítulo 85 define específicamente a los teléfonos inteligentes como dispositivos de telecomunicación celular con sistema operativo, coincidiendo con las características técnicas del producto.';

export const MOCK_AUDIT_NOTES = [
  { id: 'NOTE-85-OMA-59', type: 'capitulo', content: '...', scope: null },
  { id: 'NOTE-SECCION-OMA-151', type: 'seccion', content: '...', scope: null },
  { id: 'NOTE-SECCION-OMA-157', type: 'seccion', content: '...', scope: null },
];

export const MOCK_HEADING = {
  heading: '8517',
  explanation:
    "La clasificación se determina por aplicación de la RGI 1, ya que el texto de la partida 85.17 comprende específicamente a los 'teléfonos inteligentes y demás teléfonos celulares (móviles)'. Asimismo, la Nota 5 del Capítulo 85 define técnicamente a los teléfonos inteligentes, coincidiendo con las especificaciones de la ficha técnica.",
};

export const MOCK_SUBHEADING = {
  subheading: '851713',
  explanation:
    "Se clasifica en la subpartida 851713 por aplicación de las RGI 1 y 6. El producto cumple con la definición legal de 'teléfonos inteligentes' establecida en la Nota 5 del Capítulo 85, al ser un teléfono celular equipado con un sistema operativo para el procesamiento de datos y ejecución de aplicaciones. El texto de la subpartida 851713 denomina específicamente a estos dispositivos, distinguiéndolos de otros teléfonos celulares de la subpartida 851714.",
};

export const MOCK_CODE = {
  code: '8517.13.00.00',
  explanation:
    "La clasificación se determina por la RGI 1 y 6. El producto cumple con la definición de 'teléfonos inteligentes' establecida en la Nota 5 del Capítulo 85, al ser un dispositivo celular con sistema operativo capaz de ejecutar aplicaciones y procesar datos. Al existir una apertura específica para estos dispositivos bajo la subpartida 8517.13, se selecciona el código 8517.13.00.00.",
};
