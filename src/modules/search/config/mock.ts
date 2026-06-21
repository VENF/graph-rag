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

export const MOCK_AUDIT_NOTES = [
  { id: 'NOTE-85-OMA-59', type: 'capitulo', content: '...', scope: null },
  { id: 'NOTE-SECCION-OMA-151', type: 'seccion', content: '...', scope: null },
  { id: 'NOTE-SECCION-OMA-157', type: 'seccion', content: '...', scope: null },
];
