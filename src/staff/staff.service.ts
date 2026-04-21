import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from './entities/staff.entity';
import { StaffCursos } from './entities/staff-cursos.entity';
import { CrearStaffDto } from './dto/crear-staff.dto';
import { TrabajadorServicio } from '../usuarios/trabajador-servicio.entity';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private staffRepo: Repository<Staff>,
    @InjectRepository(StaffCursos)
    private staffCursosRepo: Repository<StaffCursos>,
    @InjectRepository(TrabajadorServicio)
    private trabajadorServicioRepo: Repository<TrabajadorServicio>,
  ) {}

  async listar(): Promise<any[]> {
    const staffList = await this.staffRepo.find({
      relations: ['trabajador', 'trabajador.especialidad', 'trabajador.cargo', 'trabajador.rol'],
      order: { orden: 'ASC', created_at: 'DESC' },
    });

    const staffConDetalles = await Promise.all(
      staffList.map(async (staff) => {
        const trabajadorServicios = await this.trabajadorServicioRepo
          .createQueryBuilder('ts')
          .leftJoinAndSelect('ts.servicio', 'servicio')
          .leftJoinAndSelect('servicio.area', 'area')
          .leftJoin('ts.trabajador', 'trabajador')
          .where('trabajador.id = :trabajadorId', { trabajadorId: staff.trabajador_id })
          .getMany();

        const serviciosUnicos = {};
        trabajadorServicios.forEach((ts) => {
          const nombreServicio = ts.servicio.nombre;
          if (!serviciosUnicos[nombreServicio]) {
            serviciosUnicos[nombreServicio] = {
              nombre: nombreServicio,
              areas: new Set(),
            };
          }
          if (ts.servicio.area?.nombre) {
            serviciosUnicos[nombreServicio].areas.add(ts.servicio.area.nombre);
          }
        });

        const servicios = Object.values(serviciosUnicos).map((s: any) => s.nombre);
        const areasUnicas = [
          ...new Set(trabajadorServicios.map((ts) => ts.servicio.area?.nombre).filter((a) => a)),
        ];

        return {
          id: staff.id,
          trabajador_id: staff.trabajador_id,
          trabajador: {
            id: staff.trabajador.id,
            nombres: staff.trabajador.nombres,
            apellidos: staff.trabajador.apellidos,
            especialidad: staff.trabajador.especialidad?.nombre,
            cargo: staff.trabajador.cargo?.nombre,
            rol: staff.trabajador.rol?.nombre,
          },
          foto: staff.foto,
          descripcion_especialidad: staff.descripcion_especialidad,
          numero_colegiatura: staff.trabajador.numero_colegiatura,
          servicios: servicios,
          areas: areasUnicas.length > 0 ? areasUnicas : ['Sin área asignada'],
          orden: staff.orden,
          activo: staff.activo,
          created_at: staff.created_at,
          updated_at: staff.updated_at,
        };
      }),
    );

    return staffConDetalles;
  }

  async listarActivos(): Promise<any[]> {
    const staffList = await this.staffRepo
      .createQueryBuilder('staff')
      .leftJoinAndSelect('staff.trabajador', 'trabajador')
      .leftJoinAndSelect('trabajador.especialidad', 'especialidad')
      .leftJoinAndSelect('trabajador.cargo', 'cargo')
      .leftJoinAndSelect('trabajador.rol', 'rol')
      .where('staff.flg_activo = :activo', { activo: true })
      .orderBy('staff.orden', 'ASC')
      .addOrderBy('staff.created_at', 'DESC')
      .getMany();

    const trabajadoresUnicos = new Map();
    staffList.forEach(staff => {
      if (!trabajadoresUnicos.has(staff.trabajador_id)) {
        trabajadoresUnicos.set(staff.trabajador_id, staff);
      }
    });

    const staffSinDuplicados = Array.from(trabajadoresUnicos.values());

    const staffConDetalles = await Promise.all(
      staffSinDuplicados.map(async (staff) => {
        const trabajadorServicios = await this.trabajadorServicioRepo
          .createQueryBuilder('ts')
          .leftJoinAndSelect('ts.servicio', 'servicio')
          .leftJoinAndSelect('servicio.area', 'area')
          .leftJoin('ts.trabajador', 'trabajador')
          .where('trabajador.id = :trabajadorId', { trabajadorId: staff.trabajador_id })
          .andWhere('ts.activo = :activo', { activo: true })
          .getMany();

        const serviciosUnicos = {};
        trabajadorServicios.forEach((ts) => {
          const nombreServicio = ts.servicio.nombre;
          if (!serviciosUnicos[nombreServicio]) {
            serviciosUnicos[nombreServicio] = {
              nombre: nombreServicio,
              areas: new Set(),
            };
          }
          if (ts.servicio.area?.nombre) {
            serviciosUnicos[nombreServicio].areas.add(ts.servicio.area.nombre);
          }
        });

        const servicios = Object.values(serviciosUnicos).map((s: any) => s.nombre);
        const areasUnicas = [
          ...new Set(trabajadorServicios.map((ts) => ts.servicio.area?.nombre).filter((a) => a)),
        ];

        return {
          id: staff.id,
          trabajador_id: staff.trabajador_id,
          trabajador: {
            id: staff.trabajador.id,
            nombres: staff.trabajador.nombres,
            apellidos: staff.trabajador.apellidos,
            especialidad: staff.trabajador.especialidad?.nombre,
            cargo: staff.trabajador.cargo?.nombre,
          },
          foto: staff.foto,
          descripcion_especialidad: staff.descripcion_especialidad,
          numero_colegiatura: staff.trabajador.numero_colegiatura,
          servicios: servicios,
          areas: areasUnicas.length > 0 ? areasUnicas : ['Sin área asignada'],
          orden: staff.orden,
        };
      }),
    );

    return staffConDetalles;
  }

  async obtenerPorId(id: number): Promise<any> {
    const staff = await this.staffRepo.findOne({
      where: { id },
      relations: ['trabajador', 'trabajador.especialidad', 'trabajador.cargo', 'trabajador.rol'],
    });

    if (!staff) {
      throw new NotFoundException(`Staff con ID ${id} no encontrado`);
    }

    const trabajadorServicios = await this.trabajadorServicioRepo
      .createQueryBuilder('ts')
      .leftJoinAndSelect('ts.servicio', 'servicio')
      .leftJoinAndSelect('servicio.area', 'area')
      .leftJoin('ts.trabajador', 'trabajador')
      .where('trabajador.id = :trabajadorId', { trabajadorId: staff.trabajador_id })
      .getMany();

    const serviciosUnicos = {};
    trabajadorServicios.forEach((ts) => {
      const nombreServicio = ts.servicio.nombre;
      if (!serviciosUnicos[nombreServicio]) {
        serviciosUnicos[nombreServicio] = {
          nombre: nombreServicio,
          areas: new Set(),
        };
      }
      if (ts.servicio.area?.nombre) {
        serviciosUnicos[nombreServicio].areas.add(ts.servicio.area.nombre);
      }
    });

    const servicios = Object.values(serviciosUnicos).map((s: any) => ({
      nombre: s.nombre,
      areas: Array.from(s.areas),
    }));

    const areasUnicas = [
      ...new Set(trabajadorServicios.map((ts) => ts.servicio.area?.nombre).filter((a) => a)),
    ];

    return {
      id: staff.id,
      trabajador_id: staff.trabajador_id,
      trabajador: {
        id: staff.trabajador.id,
        nombres: staff.trabajador.nombres,
        apellidos: staff.trabajador.apellidos,
        especialidad: staff.trabajador.especialidad?.nombre,
        cargo: staff.trabajador.cargo?.nombre,
        rol: staff.trabajador.rol?.nombre,
      },
      foto: staff.foto,
      descripcion_especialidad: staff.descripcion_especialidad,
      numero_colegiatura: staff.trabajador.numero_colegiatura,
      servicios: servicios,
      areas: areasUnicas,
      orden: staff.orden,
      activo: staff.activo,
      created_at: staff.created_at,
      updated_at: staff.updated_at,
    };
  }

  async obtenerDetalleCompleto(id: number): Promise<any> {
    const staff = await this.obtenerPorId(id);

    const cursos = await this.staffCursosRepo.find({
      where: { staff_id: id, activo: true },
      order: { orden: 'ASC', created_at: 'ASC' },
    });

    return {
      ...staff,
      cursos: cursos.map(c => ({
        id: c.id,
        descripcion: c.descripcion,
        orden: c.orden,
      })),
    };
  }

  async crear(dto: CrearStaffDto): Promise<any> {
    try {
      const existe = await this.staffRepo.findOne({
        where: { trabajador_id: dto.trabajador_id },
      });

      if (existe) {
        throw new ConflictException(
          `El trabajador con ID ${dto.trabajador_id} ya está registrado en el staff`,
        );
      }

      const nuevoStaff = this.staffRepo.create({
        trabajador_id: dto.trabajador_id,
        descripcion_especialidad: dto.descripcion_especialidad || '',
        foto: dto.foto || '',
        orden: dto.orden || 1,
        activo: dto.activo !== undefined ? dto.activo : true,
        user_id_crea: dto.user_id_crea || null,
        user_id_actua: dto.user_id_actualiza || null,
      });

      const staffGuardado = await this.staffRepo.save(nuevoStaff);

      // Guardar cursos (formaciones, diplomados, especializaciones, todo)
      if (dto.cursos && dto.cursos.length > 0) {
        for (const [index, cursoData] of dto.cursos.entries()) {
          const curso = this.staffCursosRepo.create({
            staff_id: staffGuardado.id,
            descripcion: cursoData.descripcion,
            orden: cursoData.orden || (index + 1),
            activo: true,
            user_id_crea: dto.user_id_crea || null,
            created_at: new Date(),
            updated_at: new Date(),
          });
          await this.staffCursosRepo.save(curso);
        }
      }

      return await this.obtenerDetalleCompleto(staffGuardado.id);
    } catch (error) {
      throw new BadRequestException(`Error al crear staff: ${error.message}`);
    }
  }

  async actualizar(id: number, dto: CrearStaffDto): Promise<any> {
    try {
      const staff = await this.staffRepo.findOne({ where: { id } });

      if (!staff) {
        throw new NotFoundException(`Staff con ID ${id} no encontrado`);
      }

      if (dto.trabajador_id && dto.trabajador_id !== staff.trabajador_id) {
        const existe = await this.staffRepo.findOne({
          where: { trabajador_id: dto.trabajador_id },
        });

        if (existe) {
          throw new ConflictException(
            `El trabajador con ID ${dto.trabajador_id} ya está registrado en el staff`,
          );
        }
      }

      Object.assign(staff, {
        trabajador_id: dto.trabajador_id || staff.trabajador_id,
        descripcion_especialidad: dto.descripcion_especialidad || staff.descripcion_especialidad,
        foto: dto.foto || staff.foto,
        orden: dto.orden || staff.orden,
        activo: dto.activo !== undefined ? dto.activo : staff.activo,
        user_id_actua: dto.user_id_actualiza || staff.user_id_actua,
        updated_at: new Date(),
      });

      const staffActualizado = await this.staffRepo.save(staff);

      // Manejar cursos (formaciones, diplomados, especializaciones, todo)
      if (dto.cursos && Array.isArray(dto.cursos)) {
        // ✅ Obtener todos los cursos actuales del staff
        const cursosActuales = await this.staffCursosRepo.find({
          where: { staff_id: id, activo: true }
        });

        // ✅ Obtener los IDs de los cursos que vienen en el DTO
        const idsEnDTO = dto.cursos
          .filter(c => c.id && typeof c.id === 'number' && c.id < 1000000)
          .map(c => c.id);

        // ✅ Marcar como inactivos los cursos que ya NO están en el DTO (fueron eliminados)
        for (const cursoActual of cursosActuales) {
          if (!idsEnDTO.includes(cursoActual.id)) {
            cursoActual.activo = false;
            cursoActual.updated_at = new Date();
            cursoActual.user_id_actua = dto.user_id_actualiza || cursoActual.user_id_actua;
            await this.staffCursosRepo.save(cursoActual);
          }
        }

        // ✅ Actualizar o crear los cursos del DTO
        for (const [index, cursoData] of dto.cursos.entries()) {
          const cursoId = cursoData.id;

          if (cursoId && typeof cursoId === 'number' && cursoId < 1000000) {
            // Actualizar curso existente
            const cursoExistente = await this.staffCursosRepo.findOne({
              where: { id: cursoId, staff_id: id }
            });

            if (cursoExistente) {
              Object.assign(cursoExistente, {
                descripcion: cursoData.descripcion || cursoExistente.descripcion,
                orden: cursoData.orden || (index + 1),
                activo: true, // ✅ Asegurar que esté activo
                updated_at: new Date(),
                user_id_actua: dto.user_id_actualiza || cursoExistente.user_id_actua,
              });
              await this.staffCursosRepo.save(cursoExistente);
            }
          } else {
            // Crear nuevo curso
            const nuevoCurso = this.staffCursosRepo.create({
              staff_id: id,
              descripcion: cursoData.descripcion,
              orden: cursoData.orden || (index + 1),
              activo: true,
              user_id_crea: dto.user_id_actualiza || null,
              created_at: new Date(),
              updated_at: new Date(),
            });
            await this.staffCursosRepo.save(nuevoCurso);
          }
        }
      }

      return await this.obtenerDetalleCompleto(staffActualizado.id);
    } catch (error) {
      throw new BadRequestException(`Error al actualizar staff: ${error.message}`);
    }
  }

  async eliminar(id: number): Promise<any> {
    const staff = await this.staffRepo.findOne({ where: { id } });

    if (!staff) {
      throw new NotFoundException(`Staff con ID ${id} no encontrado`);
    }

    await this.staffRepo.remove(staff);
    return { mensaje: 'Staff eliminado exitosamente', id };
  }

  async cambiarEstado(id: number, activo: boolean): Promise<any> {
    const staff = await this.staffRepo.findOne({ where: { id } });

    if (!staff) {
      throw new NotFoundException(`Staff con ID ${id} no encontrado`);
    }

    staff.activo = activo;
    staff.updated_at = new Date();

    await this.staffRepo.save(staff);

    return { mensaje: `Staff ${activo ? 'activado' : 'desactivado'} exitosamente`, id, activo };
  }
}
