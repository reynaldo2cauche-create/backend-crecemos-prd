import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrabajadorCentro } from './trabajador-centro.entity';
import { CreateTrabajadorCentroDto } from './dto/create-trabajador-centro.dto';
import { UpdateTrabajadorCentroDto } from './dto/update-trabajador-centro.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TrabajadorCentroService {
  constructor(
    @InjectRepository(TrabajadorCentro)
    private trabajadorCentroRepository: Repository<TrabajadorCentro>,
  ) {}

  findAll() {
    return this.trabajadorCentroRepository.find();
  }

  /**
   * Obtiene trabajadores activos solo con datos necesarios para select
   * @returns Array con id, nombre_completo y cargo
   */
  async findAllForSelect(): Promise<{ id: number; nombre_completo: string; cargo: string }[]> {
    const trabajadores = await this.trabajadorCentroRepository.find({
      select: ['id', 'nombres', 'apellidos', 'cargo'],
      where: { estado: true },
      order: { apellidos: 'ASC', nombres: 'ASC' }
    });

    return trabajadores.map(trabajador => ({
      id: trabajador.id,
      nombre_completo: `${trabajador.nombres} ${trabajador.apellidos}`.trim(),
      cargo: trabajador.rol?.nombre || 'Sin cargo'
    }));
  }

  async create(dto: CreateTrabajadorCentroDto) {
    console.log('DTO recibido:', dto);
    console.log('Password:', dto.password);

    if (!dto.password || dto.password.trim() === '') {
      throw new Error('Password es requerido para crear un usuario');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Insertar directamente con query builder
    const result = await this.trabajadorCentroRepository
      .createQueryBuilder()
      .insert()
      .into('trabajador_centro')
      .values({
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        dni: dto.dni,
        username: dto.username,
        password: hashedPassword,
        email: dto.email,
        rol: dto.rol,
        rol_id: dto.rol_id,
        especialidad_id: dto.especialidad_id || null,
        institucion_id: dto.institucion_id || null,
        cargo: dto.cargo || null,
        estado: true,
        sueldo_base: dto.sueldo_base || null,
        fecha_ingreso: dto.fecha_ingreso || null,
        numero_cuenta: dto.numero_cuenta || null,
        banco: dto.banco || null
      })
      .execute();

    const trabajadorId = result.identifiers[0].id;

    const trabajadorCompleto = await this.trabajadorCentroRepository.findOne({
      where: { id: trabajadorId }
    });

    const { password, ...trabajadorSinPassword } = trabajadorCompleto;
    return {
      ...trabajadorSinPassword,
      rol_objeto: trabajadorCompleto.rol ? {
        id: trabajadorCompleto.rol.id,
        nombre: trabajadorCompleto.rol.nombre,
        descripcion: trabajadorCompleto.rol.descripcion
      } : null,
      especialidad: trabajadorCompleto.especialidad ? {
        id: trabajadorCompleto.especialidad.id,
        nombre: trabajadorCompleto.especialidad.nombre,
        descripcion: trabajadorCompleto.especialidad.descripcion,
        activo: trabajadorCompleto.especialidad.activo
      } : null
    };
  }

  async update(id: number, dto: UpdateTrabajadorCentroDto) {
    console.log('Update Trabajador - ID:', id);
    console.log('Update Trabajador - DTO:', dto);

    const trabajador = await this.trabajadorCentroRepository.findOne({
      where: { id },
      relations: ['institucion']
    });

    if (!trabajador) throw new NotFoundException('Trabajador no encontrado');

    // Actualizar campos básicos
    if (dto.nombres !== undefined) trabajador.nombres = dto.nombres;
    if (dto.apellidos !== undefined) trabajador.apellidos = dto.apellidos;
    if (dto.dni !== undefined) trabajador.dni = dto.dni;
    if (dto.username !== undefined) trabajador.username = dto.username;
    if (dto.email !== undefined) trabajador.email = dto.email;
    if (dto.cargo !== undefined) trabajador.cargo = dto.cargo;

    // Campos de contacto y ubicación
    if (dto.telefono !== undefined) trabajador.telefono = dto.telefono;
    if (dto.telefono_emergencia !== undefined) trabajador.telefono_emergencia = dto.telefono_emergencia;
    if (dto.contacto_emergencia !== undefined) trabajador.contacto_emergencia = dto.contacto_emergencia;
    if (dto.direccion !== undefined) trabajador.direccion = dto.direccion;
    if (dto.distrito !== undefined) trabajador.distrito = dto.distrito;
    if (dto.provincia !== undefined) trabajador.provincia = dto.provincia;
    if (dto.departamento !== undefined) trabajador.departamento = dto.departamento;

    // Campos de tallas
    if (dto.talla_polo !== undefined) trabajador.talla_polo = dto.talla_polo;
    if (dto.talla_pantalon !== undefined) trabajador.talla_pantalon = dto.talla_pantalon;
    if (dto.talla_zapatos !== undefined) trabajador.talla_zapatos = dto.talla_zapatos;

    // Campos de RRHH
    if (dto.sueldo_base !== undefined) trabajador.sueldo_base = dto.sueldo_base;
    if (dto.fecha_ingreso !== undefined) trabajador.fecha_ingreso = dto.fecha_ingreso as any;
    if (dto.numero_cuenta !== undefined) trabajador.numero_cuenta = dto.numero_cuenta;
    if (dto.banco !== undefined) trabajador.banco = dto.banco;

    // Password - SOLO actualizar si viene en el DTO y no está vacío
    if (dto.password !== undefined && dto.password !== null && dto.password.trim() !== '') {
      trabajador.password = await bcrypt.hash(dto.password, 10);
    }

    // Relaciones
    if (dto.rol_id !== undefined) {
      trabajador.rol = { id: dto.rol_id } as any;
    }
    if (dto.especialidad_id !== undefined) {
      trabajador.especialidad = dto.especialidad_id ? { id: dto.especialidad_id } as any : null;
    }
    if (dto.institucion_id !== undefined) {
      trabajador.institucion = dto.institucion_id ? { id: dto.institucion_id } as any : null;
    }

    console.log('Update Trabajador - Data a actualizar:', trabajador);

    // Guardar usando save (maneja mejor las relaciones y campos opcionales)
    const resultado = await this.trabajadorCentroRepository.save(trabajador);

    // Recargar con todas las relaciones
    const trabajadorActualizado = await this.trabajadorCentroRepository.findOne({
      where: { id },
      relations: ['institucion']
    });

    console.log('Update Trabajador - Resultado:', trabajadorActualizado);

    // Devolver sin la contraseña y con los datos del rol y especialidad
    const { password, ...trabajadorSinPassword } = trabajadorActualizado;
    return {
      ...trabajadorSinPassword,
      rol_objeto: trabajadorActualizado.rol ? {
        id: trabajadorActualizado.rol.id,
        nombre: trabajadorActualizado.rol.nombre,
        descripcion: trabajadorActualizado.rol.descripcion
      } : null,
      especialidad: trabajadorActualizado.especialidad ? {
        id: trabajadorActualizado.especialidad.id,
        nombre: trabajadorActualizado.especialidad.nombre,
        descripcion: trabajadorActualizado.especialidad.descripcion,
        activo: trabajadorActualizado.especialidad.activo
      } : null
    };
  }

  async setEstado(id: number, estado: boolean) {
    const trabajador = await this.trabajadorCentroRepository.findOne({ where: { id } });
    if (!trabajador) throw new NotFoundException('Trabajador no encontrado');
    trabajador.estado = estado;
    return this.trabajadorCentroRepository.save(trabajador);
  }

  async findOneById(id: number) {
    const user = await this.trabajadorCentroRepository.findOne({
      where: { id }
    });
    if (!user) return null;
    const { password, rol, especialidad, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      rol_objeto: rol ? { id: rol.id, nombre: rol.nombre, descripcion: rol.descripcion } : null,
      especialidad: especialidad ? { id: especialidad.id, nombre: especialidad.nombre, descripcion: especialidad.descripcion, activo: especialidad.activo } : null
    };
  }

  // ============== MÉTODOS PARA RRHH ==============

  async findAllForRRHH(estado?: string) {
    const query = this.trabajadorCentroRepository.createQueryBuilder('trabajador')
      .orderBy('trabajador.created_at', 'DESC');

    if (estado === 'activo') {
      query.where('trabajador.estado = :estado', { estado: true });
    } else if (estado === 'inactivo') {
      query.where('trabajador.estado = :estado', { estado: false });
    }

    const trabajadores = await query.getMany();

    // Devolver sin password
    return trabajadores.map(({ password, ...trabajador }) => ({
      ...trabajador,
      // Convertir estado booleano a string para el frontend
      estado: trabajador.estado ? 'activo' : 'inactivo',
      // Renombrar campos para compatibilidad con frontend
      sueldoBase: trabajador.sueldo_base,
      fechaIngreso: trabajador.fecha_ingreso,
      numeroCuenta: trabajador.numero_cuenta,
      tipoDocumento: 'DNI',
      numeroDocumento: trabajador.dni
    }));
  }

  async remove(id: number): Promise<void> {
    const trabajador = await this.trabajadorCentroRepository.findOne({ where: { id } });
    if (!trabajador) {
      throw new NotFoundException(`Trabajador con ID ${id} no encontrado`);
    }
    await this.trabajadorCentroRepository.remove(trabajador);
  }

} 