import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotaEvolucion } from '../entities/nota-evolucion.entity';
import { CreateNotaEvolucionDto } from '../dto/create-nota-evolucion.dto';
import { Paciente } from '../paciente.entity';
import { TrabajadorCentro } from '../../usuarios/trabajador-centro.entity';
import { AsignacionTerapeuta } from '../asignacion-terapeuta.entity';
import { Servicios } from '../../catalogos/servicios.entity';
import { NotificacionesService } from 'src/notificaciones/notificaciones.service';

@Injectable()
export class NotaEvolucionService {
  constructor(
    @InjectRepository(NotaEvolucion)
    private notaEvolucionRepository: Repository<NotaEvolucion>,
    @InjectRepository(Paciente)
    private pacienteRepository: Repository<Paciente>,
    @InjectRepository(TrabajadorCentro)
    private trabajadorRepository: Repository<TrabajadorCentro>,
    @InjectRepository(AsignacionTerapeuta)
    private asignacionRepository: Repository<AsignacionTerapeuta>,
    @InjectRepository(Servicios)
    private serviciosRepository: Repository<Servicios>,
    private notificacionesService: NotificacionesService,
  ) {}

  private async detectarServicioAutomatico(terapeuta_id: number, paciente_id: number): Promise<number | null> {
    console.log('🔍 Buscando asignaciones activas para terapeuta:', terapeuta_id, 'paciente:', paciente_id);
    
    const asignaciones = await this.asignacionRepository.find({
      where: {
        terapeuta: { id: terapeuta_id },
        pacienteServicio: { 
          paciente: { id: paciente_id }, 
          activo: true
        },
        estado: 'ACTIVO',
        activo: true
      },
      relations: ['pacienteServicio', 'pacienteServicio.servicio', 'pacienteServicio.servicio.especialidad'],
      order: { fecha_asignacion: 'DESC' }
    });
    
    console.log('📊 Asignaciones encontradas:', asignaciones.length);
    
    if (asignaciones.length === 0) {
      console.log('⚠️ No hay asignaciones activas');
      return null;
    }
    
    // Mostrar todas las asignaciones para debug
    asignaciones.forEach((asig, idx) => {
      console.log(`  ${idx + 1}. Servicio: ${asig.pacienteServicio?.servicio?.nombre} (ID: ${asig.pacienteServicio?.servicio?.id}) | Especialidad: ${asig.pacienteServicio?.servicio?.especialidad?.nombre}`);
    });
    
    const servicioId = asignaciones[0].pacienteServicio.servicio.id;
    console.log('✅ Servicio más reciente seleccionado (ID):', servicioId);
    
    return servicioId;
  }

  async create(dto: CreateNotaEvolucionDto) {
    // Validar que los campos requeridos no estén vacíos
    if (!dto.paciente_id) {
      throw new BadRequestException('El ID del paciente es requerido');
    }
    if (!dto.user_id_crea) {
      throw new BadRequestException('El ID del usuario creador es requerido');
    }

    // Buscar el paciente
    const paciente = await this.pacienteRepository.findOne({
      where: { id: dto.paciente_id }
    });
    if (!paciente) {
      throw new NotFoundException(`Paciente con ID ${dto.paciente_id} no encontrado`);
    }

    // Buscar el trabajador (usuario creador)
    const trabajador = await this.trabajadorRepository.findOne({
      where: { id: dto.user_id_crea }
    });
    if (!trabajador) {
      throw new NotFoundException(`Trabajador con ID ${dto.user_id_crea} no encontrado`);
    }

    // Detectar servicio automáticamente
    const servicioId = await this.detectarServicioAutomatico(dto.user_id_crea, dto.paciente_id);

    let servicio = null;
    if (servicioId) {
      servicio = await this.serviciosRepository.findOne({
        where: { id: servicioId },
        relations: ['especialidad']
      });
      if (servicio) {
        console.log('✅ Servicio encontrado:', servicio.nombre, '| Especialidad:', servicio.especialidad?.nombre);
      } else {
        console.log('⚠️ No se encontró el servicio con ID:', servicioId);
      }
    } else {
      console.log('⚠️ No se pudo detectar ningún servicio automáticamente');
    }

    // Crear la nota de evolución CON el servicio detectado
    const nota = this.notaEvolucionRepository.create({
      paciente,
      usuarioCreador: trabajador,
      servicio: servicio,
      entrevista: dto.entrevista,
      sesion_evaluacion: dto.sesion_evaluacion,
      sesion_terapias: dto.sesion_terapias,
      objetivos_terapeuticos: dto.objetivos_terapeuticos,
      observaciones: dto.observaciones,
      fecha_crea: new Date(),
    });

    try {
      const notaGuardada = await this.notaEvolucionRepository.save(nota);

      // ✅ ============================================
      // ✅ CREAR NOTIFICACIÓN DESPUÉS DE GUARDAR
      // ✅ ============================================
      try {
        const terapeutaNombre = `${trabajador.nombres} ${trabajador.apellidos}`;
        const pacienteNombre = `${paciente.nombres} ${paciente.apellido_paterno} ${paciente.apellido_materno || ''}`.trim();
        const tipoSesion = servicio?.nombre || 'No especificado';

        await this.notificacionesService.notificarNotaEvolucion(
          trabajador.id,
          terapeutaNombre,
          pacienteNombre,
          tipoSesion,
        );

        console.log(`✅ Notificación de nota de evolución creada para ${pacienteNombre}`);
      } catch (errorNotif) {
        // No fallar si hay error en notificación, solo logear
        console.error('⚠️ Error al crear notificación (no crítico):', errorNotif.message);
      }

      // Obtener la nota con todas las relaciones para la respuesta
      const notaCompleta = await this.notaEvolucionRepository.findOne({
        where: { id: notaGuardada.id },
        relations: ['paciente', 'usuarioCreador', 'usuarioCreador.rol', 'usuarioCreador.especialidad', 'servicio', 'servicio.especialidad']
      });

      return notaCompleta;
    } catch (error) {
      console.error('❌ Error al guardar nota en BD:', error);
      throw new BadRequestException(`Error al guardar la nota: ${error.message}`);
    }
  }

  async migrarNotasAntiguasPorPaciente(paciente_id: number): Promise<{ success: boolean; mensaje: string; detalles: any }> {
    try {
      console.log(`🔄 Iniciando migración de prueba para paciente ${paciente_id}...`);

      // 1. Obtener todas las notas sin servicio_id de este paciente específico
      const notasSinServicio = await this.notaEvolucionRepository.find({
        where: {
          servicio: null,
          paciente: { id: paciente_id }
        },
        relations: ['paciente', 'usuarioCreador', 'usuarioCreador.especialidad']
      });

      console.log(`📊 Notas sin servicio del paciente ${paciente_id}: ${notasSinServicio.length}`);

      if (notasSinServicio.length === 0) {
        return {
          success: true,
          mensaje: `El paciente ${paciente_id} no tiene notas sin servicio`,
          detalles: { paciente_id, total: 0, actualizadas: 0, fallidas: 0 }
        };
      }

      let actualizadas = 0;
      let fallidas = 0;
      const errores = [];
      const notasDetalle = [];

      // 2. Procesar cada nota
      for (const nota of notasSinServicio) {
        try {
          const terapeuta = nota.usuarioCreador;
          const paciente = nota.paciente;

          if (!terapeuta || !paciente) {
            console.log(`⚠️ Nota ${nota.id}: Sin terapeuta o paciente asociado`);
            fallidas++;
            notasDetalle.push({
              nota_id: nota.id,
              fecha: nota.fecha_crea,
              estado: 'FALLIDA',
              motivo: 'Sin terapeuta o paciente asociado'
            });
            continue;
          }

          // 3. Buscar asignaciones del terapeuta con el paciente (activas o históricas)
          const asignacionesTerapeuta = await this.asignacionRepository.find({
            where: {
              terapeuta: { id: terapeuta.id },
              pacienteServicio: {
                paciente: { id: paciente.id }
              }
            },
            relations: ['pacienteServicio', 'pacienteServicio.servicio', 'pacienteServicio.servicio.especialidad'],
            order: { fecha_asignacion: 'DESC' }
          });

          // 4. Si no hay asignaciones del terapeuta específico, NO ASIGNAR NADA
          if (asignacionesTerapeuta.length === 0) {
            console.log(`⚠️ Nota ${nota.id}: El terapeuta ${terapeuta.id} (${terapeuta.nombres} ${terapeuta.apellidos}) nunca tuvo asignaciones con el paciente ${paciente.id}. NO se asigna servicio.`);
            fallidas++;
            notasDetalle.push({
              nota_id: nota.id,
              fecha: nota.fecha_crea,
              terapeuta: `${terapeuta.nombres} ${terapeuta.apellidos}`,
              estado: 'FALLIDA',
              motivo: 'Terapeuta sin asignaciones con este paciente'
            });
            continue;
          }

          // 5. Filtrar por especialidad del terapeuta si existe
          let asignacionesFiltradasPorEspecialidad = asignacionesTerapeuta;
          if (terapeuta.especialidad) {
            asignacionesFiltradasPorEspecialidad = asignacionesTerapeuta.filter(
              a => a.pacienteServicio.servicio.especialidad?.id === terapeuta.especialidad.id
            );
          }

          // 6. Si hay asignaciones filtradas, usar esas; si no, usar todas
          const asignacionesFinales = asignacionesFiltradasPorEspecialidad.length > 0
            ? asignacionesFiltradasPorEspecialidad
            : asignacionesTerapeuta;

          // 7. Buscar la asignación más cercana a la fecha de la nota
          let asignacionSeleccionada = asignacionesFinales[0];
          let menorDiferencia = Math.abs(
            new Date(asignacionSeleccionada.fecha_asignacion).getTime() -
            new Date(nota.fecha_crea).getTime()
          );

          for (const asig of asignacionesFinales) {
            const diferencia = Math.abs(
              new Date(asig.fecha_asignacion).getTime() -
              new Date(nota.fecha_crea).getTime()
            );
            if (diferencia < menorDiferencia) {
              menorDiferencia = diferencia;
              asignacionSeleccionada = asig;
            }
          }

          // 8. Asignar el servicio y GUARDAR
          nota.servicio = asignacionSeleccionada.pacienteServicio.servicio;
          await this.notaEvolucionRepository.save(nota);

          console.log(`✅ Nota ${nota.id}: Servicio asignado (${nota.servicio.nombre})`);
          actualizadas++;
          notasDetalle.push({
            nota_id: nota.id,
            fecha: nota.fecha_crea,
            terapeuta: `${terapeuta.nombres} ${terapeuta.apellidos}`,
            servicio_asignado: nota.servicio.nombre,
            servicio_id: nota.servicio.id,
            estado: 'ÉXITO',
            fecha_asignacion: asignacionSeleccionada.fecha_asignacion
          });

        } catch (error) {
          console.error(`❌ Error procesando nota ${nota.id}:`, error.message);
          errores.push({ notaId: nota.id, error: error.message });
          fallidas++;
          notasDetalle.push({
            nota_id: nota.id,
            estado: 'ERROR',
            error: error.message
          });
        }
      }

      console.log(`✅ Migración completada para paciente ${paciente_id}: ${actualizadas} actualizadas, ${fallidas} fallidas`);

      return {
        success: true,
        mensaje: `Migración completada para paciente ${paciente_id}. ${actualizadas} notas actualizadas, ${fallidas} sin servicio asignado`,
        detalles: {
          paciente_id,
          total: notasSinServicio.length,
          actualizadas,
          fallidas,
          notas: notasDetalle,
          errores: errores.length > 0 ? errores : undefined
        }
      };

    } catch (error) {
      console.error('❌ Error en migración del paciente:', error);
      return {
        success: false,
        mensaje: `Error en la migración del paciente ${paciente_id}: ${error.message}`,
        detalles: null
      };
    }
  }

 async migrarNotasAntiguas(): Promise<{ success: boolean; mensaje: string; detalles: any }> {
  try {
    console.log('🔄 Iniciando migración de notas antiguas sin servicio_id...');

    const BATCH_SIZE = 20; // Procesar de 20 en 20
    let offset = 0;
    let totalActualizadas = 0;
    let totalFallidas = 0;
    const errores = [];
    let loteNumero = 1;

    while (true) {
      console.log(`\n📦 Procesando lote ${loteNumero}...`);

      // Obtener siguiente lote de notas
      const notasSinServicio = await this.notaEvolucionRepository.find({
        where: { servicio: null },
        relations: ['paciente', 'usuarioCreador', 'usuarioCreador.especialidad'],
        take: BATCH_SIZE,
        skip: offset
      });

      // Si no hay más notas, terminar
      if (notasSinServicio.length === 0) {
        console.log('✅ No hay más notas para procesar');
        break;
      }

      console.log(`   📝 Notas en este lote: ${notasSinServicio.length}`);

      // Procesar cada nota del lote
      for (const nota of notasSinServicio) {
        try {
          const terapeuta = nota.usuarioCreador;
          const paciente = nota.paciente;

          if (!terapeuta || !paciente) {
            console.log(`   ⚠️ Nota ${nota.id}: Sin terapeuta o paciente asociado`);
            totalFallidas++;
            continue;
          }

          // Buscar asignaciones del terapeuta con el paciente
          const asignacionesTerapeuta = await this.asignacionRepository.find({
            where: {
              terapeuta: { id: terapeuta.id },
              pacienteServicio: {
                paciente: { id: paciente.id }
              }
            },
            relations: ['pacienteServicio', 'pacienteServicio.servicio', 'pacienteServicio.servicio.especialidad'],
            order: { fecha_asignacion: 'DESC' }
          });

          // Si no hay asignaciones directas, buscar por especialidad
          if (asignacionesTerapeuta.length === 0) {
            if (terapeuta.especialidad) {
              const serviciosPorEspecialidad = await this.asignacionRepository.find({
                where: {
                  pacienteServicio: {
                    paciente: { id: paciente.id },
                    servicio: {
                      especialidad: { id: terapeuta.especialidad.id }
                    }
                  }
                },
                relations: ['pacienteServicio', 'pacienteServicio.servicio', 'pacienteServicio.servicio.especialidad'],
                order: { fecha_asignacion: 'ASC' }
              });

              if (serviciosPorEspecialidad.length > 0) {
                nota.servicio = serviciosPorEspecialidad[0].pacienteServicio.servicio;
                await this.notaEvolucionRepository.save(nota);
                console.log(`   ✅ Nota ${nota.id}: Servicio asignado por especialidad`);
                totalActualizadas++;
                continue;
              }
            }

            console.log(`   ⚠️ Nota ${nota.id}: No se encontró servicio compatible`);
            totalFallidas++;
            continue;
          }

          // Filtrar por especialidad
          let asignacionesFiltradasPorEspecialidad = asignacionesTerapeuta;
          if (terapeuta.especialidad) {
            asignacionesFiltradasPorEspecialidad = asignacionesTerapeuta.filter(
              a => a.pacienteServicio.servicio.especialidad?.id === terapeuta.especialidad.id
            );
          }

          const asignacionesFinales = asignacionesFiltradasPorEspecialidad.length > 0
            ? asignacionesFiltradasPorEspecialidad
            : asignacionesTerapeuta;

          // Buscar la asignación más cercana a la fecha de la nota
          let asignacionSeleccionada = asignacionesFinales[0];
          let menorDiferencia = Math.abs(
            new Date(asignacionSeleccionada.fecha_asignacion).getTime() -
            new Date(nota.fecha_crea).getTime()
          );

          for (const asig of asignacionesFinales) {
            const diferencia = Math.abs(
              new Date(asig.fecha_asignacion).getTime() -
              new Date(nota.fecha_crea).getTime()
            );
            if (diferencia < menorDiferencia) {
              menorDiferencia = diferencia;
              asignacionSeleccionada = asig;
            }
          }

          // Asignar el servicio
          nota.servicio = asignacionSeleccionada.pacienteServicio.servicio;
          await this.notaEvolucionRepository.save(nota);

          console.log(`   ✅ Nota ${nota.id}: Servicio asignado`);
          totalActualizadas++;

        } catch (error) {
          console.error(`   ❌ Error procesando nota ${nota.id}:`, error.message);
          errores.push({ notaId: nota.id, error: error.message });
          totalFallidas++;
        }
      }

      console.log(`   📊 Lote ${loteNumero} completado: ${totalActualizadas} actualizadas, ${totalFallidas} fallidas hasta ahora`);

      offset += BATCH_SIZE;
      loteNumero++;

      // Pausa pequeña entre lotes para no saturar la BD
      await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 segundos
    }

    console.log(`\n🎉 Migración completada: ${totalActualizadas} actualizadas, ${totalFallidas} fallidas`);

    return {
      success: true,
      mensaje: `Migración completada. ${totalActualizadas} notas actualizadas, ${totalFallidas} sin servicio asignado`,
      detalles: {
        total: totalActualizadas + totalFallidas,
        actualizadas: totalActualizadas,
        fallidas: totalFallidas,
        errores: errores.length > 0 ? errores : undefined
      }
    };

  } catch (error) {
    console.error('❌ Error en migración:', error);
    return {
      success: false,
      mensaje: `Error en la migración: ${error.message}`,
      detalles: null
    };
  }
}

  async findByPaciente(paciente_id: number, trabajador_id?: number, usuario?: any, page: number = 1, limit: number = 20) {
    let notas: NotaEvolucion[];
    let total: number;

    // Admin (1) y Admisión (2): ven todas las notas sin filtro.
    // Cualquier terapeuta (jefe o no): ve las notas cuya especialidad_id del servicio
    // coincida con la especialidad_id de alguno de sus servicios asignados con este paciente.
    const esAdminOAdmision = usuario?.rol?.id === 1 || usuario?.rol?.id === 2;
    const terapeutaId = usuario?.id ?? trabajador_id;

    console.log('🔍 findByPaciente:', { paciente_id, terapeutaId, rol: usuario?.rol?.id, esAdminOAdmision });

    if (esAdminOAdmision) {
      // Admin y Admisión ven TODAS las notas del paciente
      console.log('👑 Admin/Admisión - mostrando todas las notas');
      [notas, total] = await this.notaEvolucionRepository
        .createQueryBuilder('nota')
        .leftJoinAndSelect('nota.servicio', 'servicio')
        .leftJoinAndSelect('servicio.especialidad', 'especialidad')
        .leftJoinAndSelect('nota.usuarioCreador', 'usuario')
        .leftJoinAndSelect('usuario.especialidad', 'usuarioEspecialidad')
        .leftJoinAndSelect('usuario.rol', 'rol')
        .where('nota.paciente_id = :paciente_id', { paciente_id })
        .orderBy('nota.fecha_crea', 'DESC')
        .take(limit)
        .skip((page - 1) * limit)
        .getManyAndCount();

    } else if (terapeutaId) {
      // Verificar si el usuario es jefe de área
      const esJefeDeArea = usuario?.rol?.id === 4 && usuario?.cargo?.es_jefe === true;

      if (esJefeDeArea) {
        console.log('👔 Usuario es JEFE DE ÁREA - filtrando por subordinados');

        // Obtener subordinados del jefe
        const subordinados = await this.trabajadorRepository.find({
          where: { jefe: { id: terapeutaId } },
          select: ['id', 'nombres', 'apellidos']
        });

        const subordinadosIds = subordinados.map(s => s.id);
        console.log('👥 Subordinados del jefe:', subordinadosIds, subordinados.map(s => `${s.nombres} ${s.apellidos}`));

        if (subordinadosIds.length === 0) {
          console.log('⚠️ Jefe sin subordinados - devolviendo vacío');
          return { data: [], total: 0, page, totalPages: 0 };
        }

        // Ver todas las notas del paciente creadas por subordinados
        [notas, total] = await this.notaEvolucionRepository
          .createQueryBuilder('nota')
          .leftJoinAndSelect('nota.servicio', 'servicio')
          .leftJoinAndSelect('servicio.especialidad', 'especialidad')
          .leftJoinAndSelect('nota.usuarioCreador', 'usuario')
          .leftJoinAndSelect('usuario.especialidad', 'usuarioEspecialidad')
          .leftJoinAndSelect('usuario.rol', 'rol')
          .where('nota.paciente_id = :paciente_id', { paciente_id })
          .andWhere('usuario.id IN (:...subordinadosIds)', { subordinadosIds })
          .orderBy('nota.fecha_crea', 'DESC')
          .take(limit)
          .skip((page - 1) * limit)
          .getManyAndCount();

        console.log(`✅ Notas de subordinados visibles: ${total}`);

      } else {
        console.log('👨‍⚕️ Terapeuta regular - filtrando por especialidades');

        // Obtener las especialidades de los servicios que tiene asignados
        // este terapeuta con el paciente (activos e históricos)
        const especialidades = await this.asignacionRepository
          .createQueryBuilder('asig')
          .innerJoin('asig.pacienteServicio', 'ps')
          .innerJoin('ps.servicio', 's')
          .where('asig.terapeuta_id = :terapeutaId', { terapeutaId })
          .andWhere('ps.paciente_id = :paciente_id', { paciente_id })
          .andWhere('s.especialidad_id IS NOT NULL')
          .select('DISTINCT s.especialidad_id', 'id')
          .getRawMany();

        const especialidadIds = especialidades.map(e => e.id).filter(Boolean);

        console.log('📋 Especialidades del terapeuta con este paciente:', especialidadIds);

        if (especialidadIds.length === 0) {
          console.log('⚠️ Sin asignaciones para este paciente - devolviendo vacío');
          return { data: [], total: 0, page, totalPages: 0 };
        }

        // Ver todas las notas del paciente cuyos servicios tengan
        // la misma especialidad_id que los servicios asignados al terapeuta
        [notas, total] = await this.notaEvolucionRepository
          .createQueryBuilder('nota')
          .innerJoinAndSelect('nota.servicio', 'servicio')
          .innerJoinAndSelect('servicio.especialidad', 'especialidad')
          .leftJoinAndSelect('nota.usuarioCreador', 'usuario')
          .leftJoinAndSelect('usuario.especialidad', 'usuarioEspecialidad')
          .leftJoinAndSelect('usuario.rol', 'rol')
          .where('nota.paciente_id = :paciente_id', { paciente_id })
          .andWhere('especialidad.id IN (:...especialidadIds)', { especialidadIds })
          .orderBy('nota.fecha_crea', 'DESC')
          .take(limit)
          .skip((page - 1) * limit)
          .getManyAndCount();

        console.log(`✅ Notas visibles: ${total}`);
      }

    } else {
      console.log('⚠️ Sin usuario identificado - devolviendo vacío');
      return { data: [], total: 0, page, totalPages: 0 };
    }

    return {
      data: notas.map(nota => ({
        id: nota.id,
        entrevista: nota.entrevista,
        sesion_evaluacion: nota.sesion_evaluacion,
        sesion_terapias: nota.sesion_terapias,
        objetivos_terapeuticos: nota.objetivos_terapeuticos,
        observaciones: nota.observaciones,
        fecha_crea: nota.fecha_crea,
        servicio: nota.servicio ? {
          id: nota.servicio.id,
          nombre: nota.servicio.nombre,
          especialidad: nota.servicio.especialidad?.nombre
        } : null,
        trabajador: nota.usuarioCreador ? {
          id: nota.usuarioCreador.id,
          nombres: nota.usuarioCreador.nombres,
          apellidos: nota.usuarioCreador.apellidos,
          especialidad: nota.usuarioCreador['usuarioEspecialidad'],
          rol: nota.usuarioCreador.rol
        } : null
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }
}