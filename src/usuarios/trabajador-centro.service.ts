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

  async findAllForSelect(): Promise<{ id: number; nombre_completo: string; cargo: string }[]> {
    const trabajadores = await this.trabajadorCentroRepository.find({
      select: ['id', 'nombres', 'apellidos'],
      where: { estado: true },
      relations: ['cargo'],
      order: { apellidos: 'ASC', nombres: 'ASC' }
    });

    return trabajadores.map(trabajador => ({
      id: trabajador.id,
      nombre_completo: `${trabajador.nombres} ${trabajador.apellidos}`.trim(),
      cargo: trabajador.cargo?.nombre || 'Sin cargo'
    }));
  }

  async create(dto: CreateTrabajadorCentroDto) {
    if (!dto.password || dto.password.trim() === '') {
      throw new Error('Password es requerido para crear un usuario');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const nuevoTrabajador = this.trabajadorCentroRepository.create({
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      dni: dto.dni,
      username: dto.username,
      password: hashedPassword,
      email: dto.email,
      correo_corporativo: dto.correo_corporativo || null,
      estado: true,
      telefono: dto.telefono || null,
      telefono_emergencia: dto.telefono_emergencia || null,
      contacto_emergencia: dto.contacto_emergencia || null,
      direccion: dto.direccion || null,
      distrito: dto.distrito || null,
      provincia: dto.provincia || null,
      departamento: dto.departamento || null,
      talla_polo: dto.talla_polo || null,
      talla_pantalon: dto.talla_pantalon || null,
      talla_zapatos: dto.talla_zapatos || null,
      sueldo_base: dto.sueldo_base || null,
      fecha_ingreso: dto.fecha_ingreso as any,
      numero_cuenta: dto.numero_cuenta || null,
      banco: dto.banco || null,
      rol: dto.rol_id ? { id: dto.rol_id } : null,
      especialidad: dto.especialidad_id ? { id: dto.especialidad_id } : null,
      institucion: dto.institucion_id ? { id: dto.institucion_id } : null,
      cargo: dto.cargo_id ? { id: dto.cargo_id } : null,
      jefe: dto.jefe_id ? { id: dto.jefe_id } : null,
    });

    const trabajadorGuardado = await this.trabajadorCentroRepository.save(nuevoTrabajador);

    const trabajadorCompleto = await this.trabajadorCentroRepository.findOne({
      where: { id: trabajadorGuardado.id },
      relations: ['rol', 'especialidad', 'cargo', 'institucion']
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
      } : null,
      cargo: trabajadorCompleto.cargo ? {
        id: trabajadorCompleto.cargo.id,
        nombre: trabajadorCompleto.cargo.nombre,
        es_jefe: trabajadorCompleto.cargo.es_jefe
      } : null
    };
  }

  async update(id: number, dto: UpdateTrabajadorCentroDto) {
    const trabajador = await this.trabajadorCentroRepository.findOne({
      where: { id },
      relations: ['institucion', 'cargo', 'rol', 'especialidad']
    });

    if (!trabajador) throw new NotFoundException('Trabajador no encontrado');

    const camposBloqueables = [
      'telefono',
      'telefono_emergencia',
      'contacto_emergencia',
      'direccion',
      'distrito',
      'provincia',
      'departamento',
      'talla_polo',
      'talla_pantalon',
      'talla_zapatos',
      'numero_cuenta',
      'banco'
    ];

    for (const campo of camposBloqueables) {
      if (dto[campo] !== undefined) {
        const valorActualEnBD = trabajador[campo];
        const nuevoValor = dto[campo];

        if (valorActualEnBD && valorActualEnBD.toString().trim() !== '') {
          if (nuevoValor !== valorActualEnBD) {
            throw new Error(
              `El campo '${campo}' ya está completo y no puede modificarse. Contacte al administrador si necesita cambiarlo.`
            );
          }
        }
      }
    }

    if (dto.nombres !== undefined) trabajador.nombres = dto.nombres;
    if (dto.apellidos !== undefined) trabajador.apellidos = dto.apellidos;
    if (dto.dni !== undefined) trabajador.dni = dto.dni;
    if (dto.username !== undefined) trabajador.username = dto.username;
    if (dto.email !== undefined) trabajador.email = dto.email;
    if (dto.correo_corporativo !== undefined) trabajador.correo_corporativo = dto.correo_corporativo;
    if (dto.telefono !== undefined) trabajador.telefono = dto.telefono;
    if (dto.telefono_emergencia !== undefined) trabajador.telefono_emergencia = dto.telefono_emergencia;
    if (dto.contacto_emergencia !== undefined) trabajador.contacto_emergencia = dto.contacto_emergencia;
    if (dto.direccion !== undefined) trabajador.direccion = dto.direccion;
    if (dto.distrito !== undefined) trabajador.distrito = dto.distrito;
    if (dto.provincia !== undefined) trabajador.provincia = dto.provincia;
    if (dto.departamento !== undefined) trabajador.departamento = dto.departamento;
    if (dto.talla_polo !== undefined) trabajador.talla_polo = dto.talla_polo;
    if (dto.talla_pantalon !== undefined) trabajador.talla_pantalon = dto.talla_pantalon;
    if (dto.talla_zapatos !== undefined) trabajador.talla_zapatos = dto.talla_zapatos;
    if (dto.sueldo_base !== undefined) trabajador.sueldo_base = dto.sueldo_base;
    if (dto.fecha_ingreso !== undefined) trabajador.fecha_ingreso = dto.fecha_ingreso as any;
    if (dto.numero_cuenta !== undefined) trabajador.numero_cuenta = dto.numero_cuenta;
    if (dto.banco !== undefined) trabajador.banco = dto.banco;
    if (dto.numero_colegiatura !== undefined) trabajador.numero_colegiatura = dto.numero_colegiatura;

    if (dto.password !== undefined && dto.password !== null && dto.password.trim() !== '') {
      trabajador.password = await bcrypt.hash(dto.password, 10);
    }

    if (dto.rol_id !== undefined) {
      trabajador.rol = dto.rol_id ? { id: dto.rol_id } as any : null;
    }
    if (dto.especialidad_id !== undefined) {
      trabajador.especialidad = dto.especialidad_id ? { id: dto.especialidad_id } as any : null;
    }
    if (dto.cargo_id !== undefined) {
      trabajador.cargo = dto.cargo_id ? { id: dto.cargo_id } as any : null;
    }
    if (dto.jefe_id !== undefined) {
      trabajador.jefe = dto.jefe_id ? { id: dto.jefe_id } as any : null;
    }
    if (dto.institucion_id !== undefined) {
      trabajador.institucion = dto.institucion_id ? { id: dto.institucion_id } as any : null;
    }

    await this.trabajadorCentroRepository.save(trabajador);

    const trabajadorActualizado = await this.trabajadorCentroRepository.findOne({
      where: { id },
      relations: ['institucion', 'cargo', 'rol', 'especialidad']
    });

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
      } : null,
      cargo: trabajadorActualizado.cargo ? {
        id: trabajadorActualizado.cargo.id,
        nombre: trabajadorActualizado.cargo.nombre,
        es_jefe: trabajadorActualizado.cargo.es_jefe
      } : null
    };
  }

  async getCamposBloqueados(id: number) {
    const trabajador = await this.trabajadorCentroRepository.findOne({ where: { id } });
    if (!trabajador) throw new NotFoundException('Trabajador no encontrado');

    const camposBloqueables = [
      'telefono',
      'telefono_emergencia',
      'contacto_emergencia',
      'direccion',
      'distrito',
      'provincia',
      'departamento',
      'talla_polo',
      'talla_pantalon',
      'talla_zapatos',
      'numero_cuenta',
      'banco'
    ];

    const estadoCampos = {};
    for (const campo of camposBloqueables) {
      const valor = trabajador[campo];
      estadoCampos[campo] = valor && valor.toString().trim() !== '';
    }

    return estadoCampos;
  }

  async setEstado(id: number, estado: boolean) {
    const trabajador = await this.trabajadorCentroRepository.findOne({ where: { id } });
    if (!trabajador) throw new NotFoundException('Trabajador no encontrado');
    trabajador.estado = estado;
    return this.trabajadorCentroRepository.save(trabajador);
  }

  async findOneById(id: number) {
    const user = await this.trabajadorCentroRepository.findOne({
      where: { id },
      relations: ['rol', 'especialidad', 'cargo']
    });
    if (!user) return null;
    
    const { password, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      rol_objeto: user.rol ? { 
        id: user.rol.id, 
        nombre: user.rol.nombre, 
        descripcion: user.rol.descripcion 
      } : null,
      especialidad: user.especialidad ? { 
        id: user.especialidad.id, 
        nombre: user.especialidad.nombre, 
        descripcion: user.especialidad.descripcion, 
        activo: user.especialidad.activo 
      } : null,
      cargo: user.cargo ? {
        id: user.cargo.id,
        nombre: user.cargo.nombre,
        es_jefe: user.cargo.es_jefe
      } : null
    };
  }

  async findAllForRRHH(estado?: string) {
    const query = this.trabajadorCentroRepository
      .createQueryBuilder('trabajador')
      .leftJoinAndSelect('trabajador.cargo', 'cargo')
      .orderBy('trabajador.created_at', 'DESC');

    if (estado === 'activo') {
      query.where('trabajador.estado = :estado', { estado: true });
    } else if (estado === 'inactivo') {
      query.where('trabajador.estado = :estado', { estado: false });
    }

    const trabajadores = await query.getMany();

    return trabajadores.map(({ password, ...trabajador }) => ({
      ...trabajador,
      estado: trabajador.estado ? 'activo' : 'inactivo',
      sueldoBase: trabajador.sueldo_base,
      fechaIngreso: trabajador.fecha_ingreso,
      numeroCuenta: trabajador.numero_cuenta,
      tipoDocumento: 'DNI',
      numeroDocumento: trabajador.dni,
      cargo: trabajador.cargo ? {
        id: trabajador.cargo.id,
        nombre: trabajador.cargo.nombre,
        es_jefe: trabajador.cargo.es_jefe
      } : null
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