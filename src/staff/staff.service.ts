import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from './entities/staff.entity';
import { CrearStaffDto } from './dto/crear-staff.dto';
import { TrabajadorServicio } from '../usuarios/trabajador-servicio.entity';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private staffRepo: Repository<Staff>,
    @InjectRepository(TrabajadorServicio)
    private trabajadorServicioRepo: Repository<TrabajadorServicio>,
  ) {}

  async listar(): Promise<any[]> {
    const staffList = await this.staffRepo.find({
      relations: ['trabajador', 'trabajador.especialidad', 'trabajador.cargo', 'trabajador.rol'],
      order: { orden: 'ASC', created_at: 'DESC' },
    });

    // Obtener servicios y áreas para cada trabajador del staff
    const staffConDetalles = await Promise.all(
      staffList.map(async (staff) => {
        // Obtener servicios del trabajador
        const trabajadorServicios = await this.trabajadorServicioRepo
          .createQueryBuilder('ts')
          .leftJoinAndSelect('ts.servicio', 'servicio')
          .leftJoinAndSelect('servicio.area', 'area')
          .leftJoin('ts.trabajador', 'trabajador')
          .where('trabajador.id = :trabajadorId', { trabajadorId: staff.trabajador_id })
          .getMany();

        // Extraer servicios únicos
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

        // Extraer áreas únicas
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
  // ✅ Obtener staff activos sin duplicar trabajadores
  // Agrupamos por trabajador_id y tomamos el registro más reciente (menor orden, o más reciente)
  const staffList = await this.staffRepo
    .createQueryBuilder('staff')
    .leftJoinAndSelect('staff.trabajador', 'trabajador')
    .leftJoinAndSelect('trabajador.especialidad', 'especialidad')
    .leftJoinAndSelect('trabajador.cargo', 'cargo')
    .leftJoinAndSelect('trabajador.rol', 'rol')
    .where('staff.activo = :activo', { activo: true })
    .orderBy('staff.trabajador_id', 'ASC')
    .addOrderBy('staff.orden', 'ASC')
    .addOrderBy('staff.created_at', 'DESC')
    .getMany();

  // ✅ Eliminar duplicados basándose en trabajador_id (tomar el primero después del ordenamiento)
  const trabajadoresUnicos = new Map();
  staffList.forEach(staff => {
    if (!trabajadoresUnicos.has(staff.trabajador_id)) {
      trabajadoresUnicos.set(staff.trabajador_id, staff);
    }
  });

  const staffSinDuplicados = Array.from(trabajadoresUnicos.values());

  // Obtener servicios y áreas para cada trabajador del staff
  const staffConDetalles = await Promise.all(
    staffSinDuplicados.map(async (staff) => {
      // Obtener servicios del trabajador donde activo = true
      const trabajadorServicios = await this.trabajadorServicioRepo
        .createQueryBuilder('ts')
        .leftJoinAndSelect('ts.servicio', 'servicio')
        .leftJoinAndSelect('servicio.area', 'area')
        .leftJoin('ts.trabajador', 'trabajador')
        .where('trabajador.id = :trabajadorId', { trabajadorId: staff.trabajador_id })
        .andWhere('ts.activo = :activo', { activo: true }) // ¡ESTO ES LO QUE FALTA!
        .getMany();

      // Extraer servicios únicos y sus áreas
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

      // ✅ Retornar solo los nombres únicos de servicios (sin duplicar)
      const servicios = Object.values(serviciosUnicos).map((s: any) => s.nombre);

      // Extraer áreas únicas
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

    // Obtener servicios del trabajador
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
      servicios: servicios,
      areas: areasUnicas.length > 0 ? areasUnicas : ['Sin área asignada'],
      orden: staff.orden,
      activo: staff.activo,
      created_at: staff.created_at,
      updated_at: staff.updated_at,
    };
  }

  async crear(dto: CrearStaffDto): Promise<Staff> {
    // Verificar si el trabajador ya existe en staff
    const existe = await this.staffRepo.findOne({
      where: { trabajador_id: dto.trabajador_id },
    });

    if (existe) {
      throw new ConflictException(
        `El trabajador con ID ${dto.trabajador_id} ya está registrado en el staff`,
      );
    }

    const nuevoStaff = this.staffRepo.create(dto);
    return await this.staffRepo.save(nuevoStaff);
  }

  async actualizar(id: number, dto: CrearStaffDto): Promise<Staff> {
    const staff = await this.staffRepo.findOne({ where: { id } });

    if (!staff) {
      throw new NotFoundException(`Staff con ID ${id} no encontrado`);
    }

    // Si se está cambiando el trabajador_id, verificar que no exista otro staff con ese trabajador
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

    Object.assign(staff, dto);
    return await this.staffRepo.save(staff);
  }

  async eliminar(id: number): Promise<void> {
    const staff = await this.staffRepo.findOne({ where: { id } });

    if (!staff) {
      throw new NotFoundException(`Staff con ID ${id} no encontrado`);
    }

    await this.staffRepo.remove(staff);
  }

  async cambiarEstado(id: number, activo: boolean): Promise<Staff> {
    const staff = await this.staffRepo.findOne({ where: { id } });

    if (!staff) {
      throw new NotFoundException(`Staff con ID ${id} no encontrado`);
    }

    staff.activo = activo;
    return await this.staffRepo.save(staff);
  }
}
