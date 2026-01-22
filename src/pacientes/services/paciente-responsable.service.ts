import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PacienteResponsable } from '../entities/paciente-responsable.entity';
import { Paciente } from '../paciente.entity';

@Injectable()
export class PacienteResponsableService {
  constructor(
    @InjectRepository(PacienteResponsable)
    private responsableRepository: Repository<PacienteResponsable>,
    @InjectRepository(Paciente)
    private pacienteRepository: Repository<Paciente>,
  ) {}

  /**
   * Obtener todos los responsables de un paciente
   * Maneja tanto datos legacy (columnas viejas) como nuevos (tabla paciente_responsable)
   */
  async getResponsables(pacienteId: number): Promise<PacienteResponsable[]> {
    // 1. Buscar en la tabla NUEVA
    const responsablesNuevos = await this.responsableRepository.find({
      where: {
        paciente_id: pacienteId,
        activo: true,
      },
      relations: ['tipo_documento', 'responsable_relacion', 'procesoLegalInfantil'],
      order: { orden: 'ASC' },
    });

    // 2. Si hay responsables en la tabla nueva, devolver esos
    if (responsablesNuevos.length > 0) {
      return responsablesNuevos;
    }

    // 3. Si NO hay, buscar en las columnas viejas (LEGACY)
    const paciente = await this.pacienteRepository.findOne({
      where: { id: pacienteId },
      relations: ['responsable_tipo_documento', 'responsable_relacion'],
    });

    // 4. Si existe responsable legacy, devolverlo como si fuera de la tabla nueva
    if (paciente?.responsable_nombre) {
      const responsableLegacy = new PacienteResponsable();
      responsableLegacy.id = null; // ID null indica que es legacy
      responsableLegacy.paciente_id = pacienteId;
      responsableLegacy.nombres = paciente.responsable_nombre;
      responsableLegacy.apellido_paterno = paciente.responsable_apellido_paterno;
      responsableLegacy.apellido_materno = paciente.responsable_apellido_materno;
      responsableLegacy.tipo_documento = paciente.responsable_tipo_documento;
      responsableLegacy.tipo_documento_id = paciente.responsable_tipo_documento?.id;
      responsableLegacy.numero_documento = paciente.responsable_numero_documento;
      responsableLegacy.responsable_relacion = paciente.responsable_relacion;
      responsableLegacy.responsable_relacion_id = paciente.responsable_relacion?.id;
      responsableLegacy.telefono = paciente.responsable_telefono;
      responsableLegacy.email = paciente.responsable_email;
      responsableLegacy.tiene_proceso_legal = false; // Legacy no tiene este campo
      responsableLegacy.proceso_legal_infantil_id = null;
      responsableLegacy.orden = 1;
      responsableLegacy.activo = true;

      return [responsableLegacy];
    }

    return [];
  }

  /**
   * Migrar responsable legacy a la tabla nueva
   * Se ejecuta automáticamente cuando se detecta que hay datos legacy
   * y se necesita agregar un nuevo responsable
   */
  async migrarResponsableLegacy(pacienteId: number): Promise<boolean> {
    // 1. Obtener datos del responsable viejo
    const paciente = await this.pacienteRepository.findOne({
      where: { id: pacienteId },
      relations: ['responsable_tipo_documento', 'responsable_relacion'],
    });

    if (!paciente?.responsable_nombre) {
      return false; // No hay nada que migrar
    }

    // 2. Crear el responsable en la tabla nueva
    const nuevoResponsable = this.responsableRepository.create({
      paciente_id: pacienteId,
      nombres: paciente.responsable_nombre,
      apellido_paterno: paciente.responsable_apellido_paterno,
      apellido_materno: paciente.responsable_apellido_materno,
      tipo_documento_id: paciente.responsable_tipo_documento?.id || null,
      numero_documento: paciente.responsable_numero_documento,
      responsable_relacion_id: paciente.responsable_relacion?.id || null,
      telefono: paciente.responsable_telefono,
      email: paciente.responsable_email,
      tiene_proceso_legal: false, // Legacy no tiene este campo
      proceso_legal_infantil_id: null,
      orden: 1,
      activo: true,
    });

    await this.responsableRepository.save(nuevoResponsable);

    // 3. Limpiar columnas viejas (poner en NULL)
    await this.pacienteRepository.update(pacienteId, {
      responsable_nombre: null,
      responsable_apellido_paterno: null,
      responsable_apellido_materno: null,
      responsable_tipo_documento: null,
      responsable_numero_documento: null,
      responsable_relacion: null,
      responsable_telefono: null,
      responsable_email: null,
    });

    console.log(`✅ Responsable legacy migrado para paciente ${pacienteId}`);
    return true;
  }

  /**
   * Agregar nuevo responsable
   * Si detecta datos legacy, primero los migra
   */
  async agregarResponsable(
    pacienteId: number,
    responsableData: Partial<PacienteResponsable>,
  ): Promise<PacienteResponsable> {
    // 1. Verificar si hay datos legacy
    const responsablesActuales = await this.getResponsables(pacienteId);
    const hayLegacy = responsablesActuales.some(r => r.id === null);

    // 2. Si hay legacy, migrar primero
    if (hayLegacy) {
      console.log(`🔄 Detectado responsable legacy. Migrando...`);
      await this.migrarResponsableLegacy(pacienteId);
    }

    // 3. Calcular el orden para el nuevo responsable
    const maxOrden = await this.responsableRepository
      .createQueryBuilder('responsable')
      .select('MAX(responsable.orden)', 'max')
      .where('responsable.paciente_id = :pacienteId', { pacienteId })
      .getRawOne();

    const nuevoOrden = (maxOrden?.max || 0) + 1;

    // 4. Crear el nuevo responsable
    const nuevoResponsable = this.responsableRepository.create({
      ...responsableData,
      paciente_id: pacienteId,
      orden: nuevoOrden,
      activo: true,
    });

    return await this.responsableRepository.save(nuevoResponsable);
  }

  /**
   * Agregar múltiples responsables
   * Usado al crear un paciente nuevo
   */
  async agregarMultiplesResponsables(
    pacienteId: number,
    responsablesData: Partial<PacienteResponsable>[],
  ): Promise<PacienteResponsable[]> {
    const responsablesCreados: PacienteResponsable[] = [];

    for (let i = 0; i < responsablesData.length; i++) {
      const responsableData = responsablesData[i];
      const nuevoResponsable = this.responsableRepository.create({
        ...responsableData,
        paciente_id: pacienteId,
        orden: i + 1,
        activo: true,
      });

      const responsableGuardado = await this.responsableRepository.save(nuevoResponsable);
      responsablesCreados.push(responsableGuardado);
    }

    return responsablesCreados;
  }

/**
 * Actualizar responsable existente
 * Maneja tanto responsables nuevos como legacy
 */
async actualizarResponsable(
  responsableId: number | null,
  pacienteId: number,
  responsableData: Partial<PacienteResponsable>,
): Promise<PacienteResponsable> {
  // 🔍 CASO 1: Es responsable LEGACY (sin id o id = null)
  if (!responsableId) {
    console.log('🔄 Detectado responsable legacy. Migrando antes de actualizar...');
    
    // Migrar datos legacy a la tabla nueva
    await this.migrarResponsableLegacy(pacienteId);
    
    // Obtener el registro recién creado (orden 1 = responsable principal)
    const responsableMigrado = await this.responsableRepository.findOne({
      where: { paciente_id: pacienteId, orden: 1, activo: true },
      relations: ['tipo_documento', 'responsable_relacion', 'procesoLegalInfantil'],
    });

    if (!responsableMigrado) {
      throw new Error('Error al migrar responsable legacy');
    }

    // Ahora sí actualizar con los nuevos datos
    await this.responsableRepository.update(
      { id: responsableMigrado.id },
      responsableData,
    );

    return await this.responsableRepository.findOne({
      where: { id: responsableMigrado.id },
      relations: ['tipo_documento', 'responsable_relacion', 'procesoLegalInfantil'],
    });
  }

  // 🔍 CASO 2: Es responsable NUEVO (tiene id real)
  await this.responsableRepository.update(
    { id: responsableId, paciente_id: pacienteId },
    responsableData,
  );

  return await this.responsableRepository.findOne({
    where: { id: responsableId },
    relations: ['tipo_documento', 'responsable_relacion', 'procesoLegalInfantil'],
  });
}
  /**
   * Eliminar responsable (soft delete)
   */
  async eliminarResponsable(responsableId: number, pacienteId: number): Promise<void> {
    await this.responsableRepository.update(
      { id: responsableId, paciente_id: pacienteId },
      { activo: false },
    );
  }

  /**
   * Reordenar responsables
   */
  async reordenarResponsables(pacienteId: number, ordenNuevo: number[]): Promise<void> {
    for (let i = 0; i < ordenNuevo.length; i++) {
      const responsableId = ordenNuevo[i];
      await this.responsableRepository.update(
        { id: responsableId, paciente_id: pacienteId },
        { orden: i + 1 },
      );
    }
  }
}
