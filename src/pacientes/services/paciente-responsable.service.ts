import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Responsable } from '../entities/responsable.entity';
import { ResponsablePaciente } from '../entities/responsable-paciente.entity';

@Injectable()
export class PacienteResponsableService {
  constructor(
    @InjectRepository(Responsable)
    private responsableRepo: Repository<Responsable>,
    @InjectRepository(ResponsablePaciente)
    private responsablePacienteRepo: Repository<ResponsablePaciente>,
  ) {}

  /**
   * Obtener todos los responsables de un paciente
   */
  async getResponsablesPorPaciente(pacienteId: number) {
    const relaciones = await this.responsablePacienteRepo.find({
      where: {
        paciente_id: pacienteId,
        activo: true,
      },
      relations: [
        'responsable',
        'responsable.tipo_documento',
        'responsable_relacion',
        'proceso_legal_infantil',
      ],
      order: { orden: 'ASC' },
    });

    // Transformar para incluir datos del responsable en el nivel superior
    return relaciones.map(rel => ({
      id: rel.id,
      responsable_id: rel.responsable_id,
      paciente_id: rel.paciente_id,
      // Datos del responsable
      nombres: rel.responsable.nombres,
      apellido_paterno: rel.responsable.apellido_paterno,
      apellido_materno: rel.responsable.apellido_materno,
      tipo_documento: rel.responsable.tipo_documento,
      tipo_documento_id: rel.responsable.tipo_documento_id,
      numero_documento: rel.responsable.numero_documento,
      telefono: rel.responsable.telefono,
      email: rel.responsable.email,
      // Datos de la relación
      responsable_relacion: rel.responsable_relacion,
      responsable_relacion_id: rel.responsable_relacion_id,
      tiene_proceso_legal: rel.tiene_proceso_legal,
      procesoLegalInfantil: rel.proceso_legal_infantil,
      proceso_legal_infantil_id: rel.proceso_legal_infantil_id,
      orden: rel.orden,
      activo: rel.activo,
      created_at: rel.created_at,
      updated_at: rel.updated_at,
    }));
  }

  /**
   * Buscar responsable por DNI (solo datos básicos para autocompletar)
   * Devuelve solo nombre y apellidos - el resto se llena manualmente
   */
  async buscarPorDni(numeroDocumento: string): Promise<Responsable | null> {
    if (!numeroDocumento) return null;

    return await this.responsableRepo.findOne({
      where: {
        numero_documento: numeroDocumento,
        activo: true,
      },
    });
  }

  /**
   * Agregar nuevo responsable a un paciente
   * Puede crear un responsable nuevo o vincular uno existente
   */
  async agregarResponsable(
    pacienteId: number,
    datos: {
      nombres: string;
      apellido_paterno: string;
      apellido_materno?: string;
      tipo_documento_id?: number;
      numero_documento?: string;
      telefono?: string;
      email?: string;
      responsable_relacion_id?: number;
      tiene_proceso_legal?: boolean;
      proceso_legal_infantil_id?: number;
    },
  ) {
    // 1. Buscar si ya existe un responsable con ese DNI
    let responsable: Responsable;

    if (datos.numero_documento) {
      responsable = await this.responsableRepo.findOne({
        where: {
          numero_documento: datos.numero_documento,
          activo: true,
        },
      });
    }

    // 2. Si no existe, crear nuevo responsable
    if (!responsable) {
      responsable = this.responsableRepo.create({
        nombres: datos.nombres,
        apellido_paterno: datos.apellido_paterno,
        apellido_materno: datos.apellido_materno,
        tipo_documento_id: datos.tipo_documento_id,
        numero_documento: datos.numero_documento,
        telefono: datos.telefono,
        email: datos.email,
        activo: true,
      });
      responsable = await this.responsableRepo.save(responsable);
    } else {
      // ✅ Si existe, actualizar datos que pueden cambiar (teléfono/email)
      // Mantener el mismo registro pero actualizar info de contacto
      responsable.telefono = datos.telefono || responsable.telefono;
      responsable.email = datos.email || responsable.email;
      // También actualizar nombre si ha cambiado (ej: corrección ortográfica)
      responsable.nombres = datos.nombres;
      responsable.apellido_paterno = datos.apellido_paterno;
      responsable.apellido_materno = datos.apellido_materno;
      responsable = await this.responsableRepo.save(responsable);
    }

    // 3. Verificar si ya existe la relación
    const relacionExistente = await this.responsablePacienteRepo.findOne({
      where: {
        responsable_id: responsable.id,
        paciente_id: pacienteId,
        activo: true,
      },
    });

    if (relacionExistente) {
      throw new Error('Este responsable ya está vinculado con el paciente');
    }

    // 4. Calcular el orden
    const maxOrden = await this.responsablePacienteRepo
      .createQueryBuilder('rp')
      .select('MAX(rp.orden)', 'max')
      .where('rp.paciente_id = :pacienteId', { pacienteId })
      .andWhere('rp.activo = true')
      .getRawOne();

    const nuevoOrden = (maxOrden?.max || 0) + 1;

    // 5. Crear la relación
    const relacion = this.responsablePacienteRepo.create({
      responsable_id: responsable.id,
      paciente_id: pacienteId,
      responsable_relacion_id: datos.responsable_relacion_id,
      tiene_proceso_legal: datos.tiene_proceso_legal || false,
      proceso_legal_infantil_id: datos.proceso_legal_infantil_id,
      orden: nuevoOrden,
      activo: true,
    });

    await this.responsablePacienteRepo.save(relacion);

    // 6. Retornar con todas las relaciones
    return await this.responsablePacienteRepo.findOne({
      where: { id: relacion.id },
      relations: [
        'responsable',
        'responsable.tipo_documento',
        'responsable_relacion',
        'proceso_legal_infantil',
      ],
    });
  }

  /**
   * Actualizar responsable y su relación con el paciente
   */
  async actualizarResponsable(
    pacienteId: number,
    relacionId: number,
    datos: {
      nombres?: string;
      apellido_paterno?: string;
      apellido_materno?: string;
      tipo_documento_id?: number;
      numero_documento?: string;
      telefono?: string;
      email?: string;
      responsable_relacion_id?: number;
      tiene_proceso_legal?: boolean;
      proceso_legal_infantil_id?: number;
    },
  ) {
    // 1. Buscar la relación
    const relacion = await this.responsablePacienteRepo.findOne({
      where: {
        id: relacionId,
        paciente_id: pacienteId,
        activo: true,
      },
      relations: ['responsable'],
    });

    if (!relacion) {
      throw new NotFoundException('Relación no encontrada');
    }

    // 2. Actualizar datos del responsable
    await this.responsableRepo.update(relacion.responsable_id, {
      nombres: datos.nombres,
      apellido_paterno: datos.apellido_paterno,
      apellido_materno: datos.apellido_materno,
      tipo_documento_id: datos.tipo_documento_id,
      numero_documento: datos.numero_documento,
      telefono: datos.telefono,
      email: datos.email,
    });

    // 3. Actualizar datos de la relación
    await this.responsablePacienteRepo.update(relacionId, {
      responsable_relacion_id: datos.responsable_relacion_id,
      tiene_proceso_legal: datos.tiene_proceso_legal,
      proceso_legal_infantil_id: datos.proceso_legal_infantil_id,
    });

    // 4. Retornar con todas las relaciones
    return await this.responsablePacienteRepo.findOne({
      where: { id: relacionId },
      relations: [
        'responsable',
        'responsable.tipo_documento',
        'responsable_relacion',
        'proceso_legal_infantil',
      ],
    });
  }

  /**
   * Eliminar responsable de un paciente (soft delete)
   * Solo desvincula, no elimina el responsable de la BD
   */
  async eliminarResponsable(pacienteId: number, relacionId: number) {
    const relacion = await this.responsablePacienteRepo.findOne({
      where: {
        id: relacionId,
        paciente_id: pacienteId,
      },
    });

    if (!relacion) {
      throw new NotFoundException('Relación no encontrada');
    }

    // Soft delete - solo marcar como inactivo
    await this.responsablePacienteRepo.update(relacionId, {
      activo: false,
    });

    return { success: true, message: 'Responsable desvinculado correctamente' };
  }

  /**
   * Agregar múltiples responsables al crear paciente
   * 🆕 Soporta tanto responsables existentes (con responsable_id) como nuevos
   */
  async agregarMultiplesResponsables(
    pacienteId: number,
    responsablesData: Array<{
      responsable_id?: number; // 🆕 ID del responsable existente (evita duplicados)
      nombres?: string;
      apellido_paterno?: string;
      apellido_materno?: string;
      tipo_documento_id?: number;
      numero_documento?: string;
      telefono?: string;
      email?: string;
      responsable_relacion_id?: number;
      tiene_proceso_legal?: boolean;
      proceso_legal_infantil_id?: number;
    }>,
  ) {
    const responsablesCreados = [];

    for (let i = 0; i < responsablesData.length; i++) {
      const datos = responsablesData[i];
      let responsableId: number;

      // 🆕 Si viene responsable_id, usar responsable existente (NO DUPLICAR)
      if (datos.responsable_id) {
        // Verificar que el responsable exista
        const responsableExistente = await this.responsableRepo.findOne({
          where: { id: datos.responsable_id, activo: true },
        });

        if (!responsableExistente) {
          throw new NotFoundException(`Responsable con ID ${datos.responsable_id} no encontrado`);
        }

        responsableId = datos.responsable_id;
      } else {
        // Si NO viene responsable_id, crear nuevo responsable
        const responsable = this.responsableRepo.create({
          nombres: datos.nombres,
          apellido_paterno: datos.apellido_paterno,
          apellido_materno: datos.apellido_materno,
          tipo_documento_id: datos.tipo_documento_id,
          numero_documento: datos.numero_documento,
          telefono: datos.telefono,
          email: datos.email,
          activo: true,
        });
        const responsableGuardado = await this.responsableRepo.save(responsable);
        responsableId = responsableGuardado.id;
      }

      // 2. Crear relación paciente-responsable
      const relacion = this.responsablePacienteRepo.create({
        responsable_id: responsableId,
        paciente_id: pacienteId,
        responsable_relacion_id: datos.responsable_relacion_id,
        tiene_proceso_legal: datos.tiene_proceso_legal || false,
        proceso_legal_infantil_id: datos.proceso_legal_infantil_id,
        orden: i + 1,
        activo: true,
      });
      await this.responsablePacienteRepo.save(relacion);

      responsablesCreados.push(relacion);
    }

    return responsablesCreados;
  }
}
