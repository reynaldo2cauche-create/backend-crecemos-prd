/**
 * Utilidades para generar descripciones detalladas en auditoría
 * Sistema de Centro Crecemos
 */

/**
 * Campos a excluir de la comparación
 */
const CAMPOS_EXCLUIDOS = [
  'id',
  'created_at',
  'updated_at',
  'createdAt',
  'updatedAt',
  'fechaCreacion',
  'fechaActualizacion',
  'fecha_creacion',
  'fecha_actualizacion',
  'fecha_crea',
  'fecha_actua',
  'fechaCrea',
  'fechaActua',
  'password',
  'passwordConfirm',
  'currentPassword',
  'newPassword',
  'token',
  'refreshToken',
  'user_id_crea',
  'user_id_actua',
  'userIdCrea',
  'userIdActua',
  'usuario_id',
  'usuarioId',
  'activo',
  'eliminado',
  // 🔥 EXCLUIR RELACIONES Y CAMPOS AUTOMÁTICOS
  'usuario',
  'usuarioActua',
  'paciente',
  'pacienteId',
  'trabajador',
  'trabajadorId',
  'terapeuta',
  'terapeutaId',
  'servicio',
  'servicioId',
  'creadoPor',
  'actualizadoPor',
  'creadoEn',
  'actualizadoEn',
  // Relaciones de Historia Clínica
  'atenciones',
  'relacionPadres',
  'gradoEscolar',
  'hermanos',
  'familiares',
  'datosAnteriores',
  'datosNuevos',
  // IDs de campos con relaciones (para que solo se muestre el nombre, no el ID)
  'otrasAtenciones',
  'relacionEntrePadres',
  'escolaridad',
];

/**
 * Mapeo de nombres de campos técnicos a nombres legibles en español
 */
const NOMBRES_CAMPOS: Record<string, string> = {
  // Pacientes
  nombres: 'Nombres',
  apellidos: 'Apellidos',
  apellido_paterno: 'Apellido Paterno',
  apellido_materno: 'Apellido Materno',
  numero_documento: 'Número de Documento',
  tipo_documento_id: 'Tipo de Documento',
  sexo: 'Sexo',
  fecha_nacimiento: 'Fecha de Nacimiento',
  telefono: 'Teléfono',
  telefono_emergencia: 'Teléfono de Emergencia',
  email: 'Email',
  direccion: 'Dirección',
  distrito_id: 'Distrito',
  referencia_direccion: 'Referencia de Dirección',
  estado_paciente_id: 'Estado del Paciente',
  mostrar_en_listado: 'Visible en Listado',
  ocupacion: 'Ocupación',
  religion: 'Religión',
  lugar_nacimiento: 'Lugar de Nacimiento',

  // Citas
  fecha: 'Fecha',
  fecha_cita: 'Fecha',
  hora_inicio: 'Hora de Inicio',
  hora_fin: 'Hora de Fin',
  paciente_id: 'Paciente',
  paciente: 'Paciente',
  doctor_id: 'Terapeuta',
  doctor: 'Terapeuta',
  terapeuta_id: 'Terapeuta',
  terapeuta: 'Terapeuta',
  servicio_id: 'Servicio',
  servicio: 'Servicio',
  motivo_id: 'Motivo',
  motivo: 'Motivo',
  tipo_cita_id: 'Tipo de Cita',
  estado_id: 'Estado',
  estado: 'Estado',
  nota: 'Notas',
  observaciones: 'Observaciones',
  motivo_consulta: 'Motivo de Consulta',
  diagnostico_preliminar: 'Diagnóstico Preliminar',
  plan_tratamiento: 'Plan de Tratamiento',
  duracion_minutos: 'Duración (minutos)',

  // Visita Escolar (campos específicos)
  nombre_colegio: 'Nombre del Colegio',
  nombre_intermediario: 'Nombre del Encargado',

  // Reunión Clínica (campos específicos)
  terapeutas_ids: 'Terapeutas Asignados',
  servicios_ids: 'Servicios Incluidos',
  reunion_clinica: 'Datos de Reunión Clínica',

  // Historia Clínica
  diagnostico: 'Diagnóstico',
  medicacion_actual: 'Medicación Actual',
  alergias: 'Alergias',
  antecedentes_personales: 'Antecedentes Personales',
  antecedentes_familiares: 'Antecedentes Familiares',
  motivo_consulta_inicial: 'Motivo de Consulta Inicial',
  evolucion: 'Evolución',
  recomendaciones: 'Recomendaciones',

  // Notas de Evolución
  fecha_nota: 'Fecha de Nota',
  observaciones_terapeuta: 'Observaciones del Terapeuta',

  // Responsables
  contacto_emergencia: 'Contacto de Emergencia',
  parentesco: 'Parentesco',
  relacion: 'Relación',
  vive_con_paciente: 'Vive con el Paciente',

  // Servicios
  fecha_inicio: 'Fecha de Inicio',
  fecha_fin: 'Fecha de Fin',
  sesiones_totales: 'Sesiones Totales',
  sesiones_realizadas: 'Sesiones Realizadas',

  // Reporte de Evolución
  servicioId: 'Servicio',
  servicioNombre: 'Servicio',
  edad: 'Edad',
  fecha_evaluacion: 'Fecha de Evaluación',
  fechaEvaluacion: 'Fecha de Evaluación',
  periodo_intervencion: 'Período de Intervención',
  periodoIntervencion: 'Período de Intervención',
  frecuencia_atencion: 'Frecuencia de Atención',
  frecuenciaAtencion: 'Frecuencia de Atención',
  especialista: 'Especialista',
  metodologia: 'Metodología',
  objetivos: 'Objetivos',
  logros: 'Logros',
  dificultades: 'Dificultades',
  objetivos_siguiente_periodo: 'Objetivos Siguiente Período',
  objetivosSiguientePeriodo: 'Objetivos Siguiente Período',

  // Entrevista a Padres
  escolaridad: 'Escolaridad',
  escolaridadNombre: 'Escolaridad',
  motivoConsulta: 'Motivo de Consulta',
  otras_atenciones: 'Otras Atenciones',
  otrasAtenciones: 'Otras Atenciones',
  otrasAtencionesNombre: 'Otras Atenciones',
  relacionEntrePadresNombre: 'Relación entre Padres',
  antecedentes_medicos: 'Antecedentes Médicos',
  antecedentesMedicos: 'Antecedentes Médicos',
  antecedentes_psiquiatricos: 'Antecedentes Psiquiátricos',
  antecedentesPsiquiatricos: 'Antecedentes Psiquiátricos',
  antecedentes_toxicologicos: 'Antecedentes Toxicológicos',
  antecedentesToxicologicos: 'Antecedentes Toxicológicos',
  relacion_entre_padres: 'Relación entre Padres',
  relacionEntrePadres: 'Relación entre Padres',
  detalle_relacion_padres: 'Detalle Relación Padres',
  detalleRelacionPadres: 'Detalle Relación Padres',
  cantidad_hermanos: 'Cantidad de Hermanos',
  cantidadHermanos: 'Cantidad de Hermanos',
  tiempo_juego: 'Tiempo de Juego',
  tiempoJuego: 'Tiempo de Juego',
  tiempo_dispositivos: 'Tiempo en Dispositivos',
  tiempoDispositivos: 'Tiempo en Dispositivos',
  antecedentes_prenatales: 'Antecedentes Prenatales',
  antecedentesPrenatales: 'Antecedentes Prenatales',
  desarrollo_motor: 'Desarrollo Motor',
  desarrolloMotor: 'Desarrollo Motor',
  desarrollo_lenguaje: 'Desarrollo del Lenguaje',
  desarrolloLenguaje: 'Desarrollo del Lenguaje',
  alimentacion: 'Alimentación',
  sueno: 'Sueño',
  control_esfinteres: 'Control de Esfínteres',
  controlEsfinteres: 'Control de Esfínteres',
  antecedentes_medicos_nino: 'Antecedentes Médicos del Niño',
  antecedentesMedicosNino: 'Antecedentes Médicos del Niño',
  antecedentes_escolares: 'Antecedentes Escolares',
  antecedentesEscolares: 'Antecedentes Escolares',
  relacion_pares: 'Relación con Pares',
  relacionPares: 'Relación con Pares',
  expresion_emocional: 'Expresión Emocional',
  expresionEmocional: 'Expresión Emocional',
  relacion_autoridad: 'Relación con Autoridad',
  relacionAutoridad: 'Relación con Autoridad',
  juegos_preferidos: 'Juegos Preferidos',
  juegosPreferidos: 'Juegos Preferidos',
  actividades_favoritas: 'Actividades Favoritas',
  actividadesFavoritas: 'Actividades Favoritas',

  // Evaluación Terapia Ocupacional
  tipo_parto: 'Tipo de Parto',
  tipoParto: 'Tipo de Parto',
  estimulacion_temprana: 'Estimulación Temprana',
  estimulacionTemprana: 'Estimulación Temprana',
  terapias_anteriores: 'Terapias Anteriores',
  terapiasAnteriores: 'Terapias Anteriores',
  observaciones_datos_generales: 'Observaciones Datos Generales',
  observacionesDatosGenerales: 'Observaciones Datos Generales',
  nivel_alerta: 'Nivel de Alerta',
  nivelAlerta: 'Nivel de Alerta',
  nivel_atencion: 'Nivel de Atención',
  nivelAtencion: 'Nivel de Atención',
  nivel_actividad: 'Nivel de Actividad',
  nivelActividad: 'Nivel de Actividad',
  pacienteId: 'Paciente',
  usa_lentes: 'Usa Lentes',
  fijacion_visual: 'Fijación Visual',
  contacto_visual: 'Contacto Visual',
  seguimiento_visual: 'Seguimiento Visual',
  observaciones_visuales: 'Observaciones Visuales',
  reconoce_fuentes_sonoras: 'Reconoce Fuentes Sonoras',
  busca_sonido: 'Busca Sonido',
  observaciones_auditivas: 'Observaciones Auditivas',
  desordenes_modulacion: 'Desórdenes de Modulación',
  hiperresponsividad_tactil: 'Hiperresponsividad Táctil',
  hiporresponsividad_tactil: 'Hiporresponsividad Táctil',
  observaciones_tactiles: 'Observaciones Táctiles',
  selectividad_comidas: 'Selectividad de Comidas',
  observaciones_gustativos: 'Observaciones Gustativas',
  hiperresponsividad_propioceptivo: 'Hiperresponsividad Propioceptiva',
  hiporresponsividad_propioceptivo: 'Hiporresponsividad Propioceptiva',
  observaciones_propioceptivo: 'Observaciones Propioceptivas',
  inseguridad_gravitacional: 'Inseguridad Gravitacional',
  intolerancia_movimiento: 'Intolerancia al Movimiento',
  hiporrespuesta_movimiento: 'Hiporrespuesta al Movimiento',
  observaciones_vestibular: 'Observaciones Vestibulares',
  fuerza_muscular: 'Fuerza Muscular',
  rango_articular: 'Rango Articular',
  coordinacion_bimanual: 'Coordinación Bimanual',
  cruce_linea_media: 'Cruce Línea Media',
  dominacion_manual: 'Dominación Manual',
  observaciones_motor: 'Observaciones Motoras',
  intereses: 'Intereses',
  atencion_concentracion: 'Atención y Concentración',
  seguimiento_ordenes: 'Seguimiento de Órdenes',
  otros_cognitivo: 'Otros Aspectos Cognitivos',
  alimentacion_independiente: 'Alimentación Independiente',
  observacion_alimentacion: 'Observación Alimentación',
  desvestido_superior: 'Desvestido Superior',
  desvestido_inferior: 'Desvestido Inferior',
  vestido_superior: 'Vestido Superior',
  vestido_inferior: 'Vestido Inferior',
  manejo_botones: 'Manejo de Botones',
  manejo_cierre: 'Manejo de Cierre',
  manejo_lazos: 'Manejo de Lazos',
  observacion_vestido: 'Observación Vestido',
  esfinter_vesical: 'Esfínter Vesical',
  esfinter_anal: 'Esfínter Anal',
  lavado_manos: 'Lavado de Manos',
  lavado_cara: 'Lavado de Cara',
  cepillado_dientes: 'Cepillado de Dientes',
  observacion_higiene: 'Observación Higiene',
  prension_lapiz_imitado: 'Prensión Lápiz (Imitado)',
  prension_lapiz_copiado: 'Prensión Lápiz (Copiado)',
  prension_lapiz_coloreado: 'Prensión Lápiz (Coloreado)',
  recortado: 'Recortado',
  prension_tijeras: 'Prensión de Tijeras',
  observacion_escolar: 'Observación Escolar',
  juguetes_preferidos: 'Juguetes Preferidos',
  tipo_juego_sensoriomotor: 'Tipo de Juego Sensoriomotor',
  tipo_juego_simbolico: 'Tipo de Juego Simbólico',
  tipo_juego_otro: 'Otro Tipo de Juego',
  lugar_preferido_jugar: 'Lugar Preferido para Jugar',
  observacion_juego: 'Observación Juego',
  lenguaje: 'Lenguaje',
  conclusiones: 'Conclusiones',
  sugerencias: 'Sugerencias',
  objetivos_iniciales: 'Objetivos Iniciales',
};

/**
 * Interfaz para representar un cambio detectado
 */
export interface CambioDetectado {
  campo: string;
  nombreCampo: string;
  valorAnterior: any;
  valorNuevo: any;
  valorAnteriorFormateado: string;
  valorNuevoFormateado: string;
}

/**
 * Compara dos objetos y retorna los cambios detectados
 */
export function detectarCambios(
  datosAnteriores: any,
  datosNuevos: any,
): CambioDetectado[] {
  if (!datosAnteriores || !datosNuevos) {
    return [];
  }

  const cambios: CambioDetectado[] = [];

  // Obtener todas las claves de ambos objetos
  const claves = new Set([
    ...Object.keys(datosAnteriores),
    ...Object.keys(datosNuevos),
  ]);

  for (const campo of claves) {
    // Ignorar campos excluidos básicos
    if (CAMPOS_EXCLUIDOS.includes(campo)) {
      continue;
    }

    const valorAnterior = datosAnteriores[campo];
    const valorNuevo = datosNuevos[campo];

    // 🔥 IGNORAR CAMBIOS EN OBJETOS RELACIONADOS (relaciones de base de datos)
    // Si es un objeto con 'id', es una relación y NO debe registrarse como cambio
    if (typeof valorAnterior === 'object' && valorAnterior !== null && valorAnterior.id !== undefined) {
      continue;
    }
    if (typeof valorNuevo === 'object' && valorNuevo !== null && valorNuevo.id !== undefined) {
      continue;
    }

    // 🔥 IGNORAR ARRAYS DE OBJETOS (como hermanos, familiares, etc.)
    if (Array.isArray(valorAnterior) || Array.isArray(valorNuevo)) {
      continue;
    }

    // Comparar valores (manejar null, undefined, objetos)
    if (sonValoresDiferentes(campo, valorAnterior, valorNuevo)) {
      cambios.push({
        campo,
        nombreCampo: NOMBRES_CAMPOS[campo] || formatearNombreCampo(campo),
        valorAnterior,
        valorNuevo,
        valorAnteriorFormateado: formatearValor(campo, valorAnterior),
        valorNuevoFormateado: formatearValor(campo, valorNuevo),
      });
    }
  }

  return cambios;
}

/**
 * Compara dos valores y determina si son diferentes
 */
function sonValoresDiferentes(campo: string, valor1: any, valor2: any): boolean {
  // 🔥 NUEVA LÓGICA: Si ambos valores son vacíos (null, undefined, '', 0), NO considerar como cambio
  const esVacio1 = esValorVacio(valor1);
  const esVacio2 = esValorVacio(valor2);

  // Si ambos son vacíos, NO hay cambio
  if (esVacio1 && esVacio2) {
    return false;
  }

  // Si uno es vacío y el otro no, SÍ hay cambio
  if (esVacio1 !== esVacio2) {
    return true;
  }

  // 🔥 Para TODAS las fechas tipo "date", comparar solo día/mes/año en UTC (ignorar hora y timezone)
  if (campo.includes('fecha') || campo.includes('date') || campo.includes('Fecha') ||
      campo.includes('nacimiento') || campo.includes('birth') || campo.includes('Evaluacion')) {
    try {
      const fecha1 = new Date(valor1);
      const fecha2 = new Date(valor2);
      if (!isNaN(fecha1.getTime()) && !isNaN(fecha2.getTime())) {
        // Comparar solo año, mes y día en UTC
        return fecha1.getUTCFullYear() !== fecha2.getUTCFullYear() ||
               fecha1.getUTCMonth() !== fecha2.getUTCMonth() ||
               fecha1.getUTCDate() !== fecha2.getUTCDate();
      }
    } catch {
      // Si falla, hacer comparación normal
    }
  }

  // Si ambos son objetos, comparar por JSON
  if (typeof valor1 === 'object' && typeof valor2 === 'object') {
    // Ignorar objetos relacionados (foreign keys)
    if (valor1.id !== undefined && valor2.id !== undefined) {
      return valor1.id !== valor2.id;
    }
    return JSON.stringify(valor1) !== JSON.stringify(valor2);
  }

  // Comparación normal
  return valor1 !== valor2;
}

/**
 * 🔥 NUEVA FUNCIÓN: Determina si un valor debe considerarse como "vacío"
 */
function esValorVacio(valor: any): boolean {
  if (valor === null || valor === undefined) {
    return true;
  }

  // String vacío
  if (typeof valor === 'string' && valor.trim() === '') {
    return true;
  }

  // Arreglo vacío
  if (Array.isArray(valor) && valor.length === 0) {
    return true;
  }

  // Objeto vacío (sin propiedades relevantes)
  if (typeof valor === 'object' && !Array.isArray(valor)) {
    const keys = Object.keys(valor).filter(k => !CAMPOS_EXCLUIDOS.includes(k));
    return keys.length === 0;
  }

  return false;
}

/**
 * Formatea un valor para mostrarlo de forma legible
 * 🔥 MODIFICADO: Mejor manejo de valores vacíos para auditoría
 */
function formatearValor(campo: string, valor: any): string {
  // Verificar si el valor es realmente vacío
  if (esValorVacio(valor)) {
    return '(sin información)';
  }

  // Fechas
  if (
    campo.includes('fecha') ||
    campo.includes('date') ||
    campo.includes('Fecha') ||
    campo.includes('Evaluacion') ||
    valor instanceof Date
  ) {
    try {
      const fecha = new Date(valor);
      if (!isNaN(fecha.getTime())) {
        // 🔥 Para TODAS las fechas tipo "date" (sin hora), usar UTC para evitar problemas de timezone
        // Esto incluye: fecha_evaluacion, fecha_nacimiento, fecha, etc.
        const year = fecha.getUTCFullYear();
        const month = String(fecha.getUTCMonth() + 1).padStart(2, '0');
        const day = String(fecha.getUTCDate()).padStart(2, '0');
        return `${day}/${month}/${year}`;
      }
    } catch {
      return String(valor);
    }
  }

  // Booleanos (incluye valores 0 y 1 de la base de datos)
  if (typeof valor === 'boolean') {
    return valor ? 'Sí' : 'No';
  }

  // 🔥 Convertir 0 y 1 numéricos a Sí/No (para campos boolean de evaluación de terapia)
  if (valor === 1) {
    return 'Sí';
  }
  if (valor === 0) {
    return 'No';
  }

  // Objetos (relaciones)
  if (typeof valor === 'object') {
    // Si tiene nombre completo
    if (valor.nombre_completo) {
      return valor.nombre_completo;
    }
    // Si tiene nombres y apellidos
    if (valor.nombres && valor.apellidos) {
      return `${valor.nombres} ${valor.apellidos}`;
    }
    // Si tiene nombre
    if (valor.nombre) {
      return valor.nombre;
    }
    // Si tiene descripcion
    if (valor.descripcion) {
      return valor.descripcion;
    }
    return JSON.stringify(valor);
  }

  // Números
  if (typeof valor === 'number') {
    return valor.toLocaleString('es-PE');
  }

  // String largo (truncar)
  const valorStr = String(valor);
  if (valorStr.length > 100) {
    return valorStr.substring(0, 97) + '...';
  }

  return valorStr;
}

/**
 * Convierte un nombre de campo técnico a formato legible
 * Ejemplo: "fecha_nacimiento" -> "Fecha Nacimiento"
 */
function formatearNombreCampo(campo: string): string {
  return campo
    .split('_')
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
}

/**
 * Genera una descripción detallada basada en los cambios detectados
 */
export function generarDescripcionDetallada(
  modulo: string,
  accion: string,
  nombreEntidad: string,
  cambios: CambioDetectado[],
): string {
  if (cambios.length === 0) {
    return `Sin cambios detectados en ${nombreEntidad}`;
  }

  // Si solo hay un cambio, formato simple
  if (cambios.length === 1) {
    const cambio = cambios[0];
    return `Modificó ${cambio.nombreCampo.toLowerCase()} de ${nombreEntidad}: ${cambio.valorAnteriorFormateado} → ${cambio.valorNuevoFormateado}`;
  }

  // Si hay múltiples cambios, formato multilínea
  const lineasCambios = cambios.map(
    (cambio) =>
      `• ${cambio.nombreCampo}: ${cambio.valorAnteriorFormateado} → ${cambio.valorNuevoFormateado}`,
  );

  return `Modificó ${nombreEntidad}:\n${lineasCambios.join('\n')}`;
}

/**
 * Extrae el nombre de la entidad para la descripción
 */
export function extraerNombreEntidad(
  modulo: string,
  datosAnteriores: any,
  datosNuevos: any,
  idEntidad?: number,
): string {
  const datos = datosNuevos || datosAnteriores;

  switch (modulo) {
    case 'PACIENTES':
      // Intentar obtener el nombre completo del paciente de múltiples formas
      if (datos?.nombre_completo) {
        return `paciente ${datos.nombre_completo}`;
      }
      if (datos?.nombres) {
        const apellidos = datos.apellidos ||
                         [datos.apellido_paterno, datos.apellido_materno].filter(Boolean).join(' ') ||
                         '';
        return `paciente ${datos.nombres} ${apellidos}`.trim();
      }
      return idEntidad ? `paciente #${idEntidad}` : 'paciente';

    case 'CITAS':
      // Intentar obtener nombre del paciente de la cita
      if (datos?.paciente) {
        const paciente = datos.paciente;
        if (paciente.nombre_completo) {
          return `cita de ${paciente.nombre_completo}`;
        }
        if (paciente.nombres) {
          const apellidos = paciente.apellidos ||
                           [paciente.apellido_paterno, paciente.apellido_materno].filter(Boolean).join(' ') ||
                           '';
          return `cita de ${paciente.nombres} ${apellidos}`.trim();
        }
      }
      return idEntidad ? `cita #${idEntidad}` : 'cita';

    case 'HISTORIA_CLINICA':
      // Manejar los diferentes tipos de documentos de historia clínica
      let nombrePaciente = '';

      if (datos?.paciente) {
        const paciente = datos.paciente;
        if (paciente.nombre_completo) {
          nombrePaciente = paciente.nombre_completo;
        } else if (paciente.nombres) {
          const apellidos = paciente.apellidos ||
                           [paciente.apellido_paterno, paciente.apellido_materno].filter(Boolean).join(' ') ||
                           '';
          nombrePaciente = `${paciente.nombres} ${apellidos}`.trim();
        }
      }

      // Retornar descripción específica según el tipo de documento
      if (nombrePaciente) {
        // Detectar el tipo de documento por los campos que contiene
        if (datos?.escolaridad !== undefined || datos?.motivoConsulta !== undefined) {
          return `entrevista a padres de ${nombrePaciente}`;
        }
        if (datos?.servicioId !== undefined || datos?.periodoIntervencion !== undefined) {
          return `reporte de evolución de ${nombrePaciente}`;
        }
        if (datos?.tipoParto !== undefined || datos?.estimulacionTemprana !== undefined) {
          return `evaluación de terapia ocupacional de ${nombrePaciente}`;
        }
        return `historia clínica de ${nombrePaciente}`;
      }

      return 'historia clínica';

    default:
      return modulo.toLowerCase();
  }
}

/**
 * Determina si una acción requiere descripción detallada
 */
export function requiereDescripcionDetallada(
  modulo: string,
  accion: string,
): boolean {
  const accionesDetalladas = [
    'EDITAR_PACIENTE',
    'EDITAR_CITA',
    'EDITAR_HISTORIA_CLINICA',
    'EDITAR_NOTA_EVOLUCION',
    'EDITAR_REPORTE_EVOLUCION',
    'EDITAR_ENTREVISTA_PADRES',
    'EDITAR_EVALUACION_TERAPIA',
  ];

  return accionesDetalladas.includes(accion);
}
