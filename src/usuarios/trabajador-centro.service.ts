import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrabajadorCentro } from './trabajador-centro.entity';
import { CreateTrabajadorCentroDto } from './dto/create-trabajador-centro.dto';
import { UpdateTrabajadorCentroDto } from './dto/update-trabajador-centro.dto';
import { Distrito } from '../catalogos/distrito.entity';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TrabajadorCentroService {
  constructor(
    @InjectRepository(TrabajadorCentro)
    private trabajadorCentroRepository: Repository<TrabajadorCentro>,
  ) {}

  // Helper para convertir valores vacíos a null
  private toNullIfEmpty(value: any): any {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    // Si es un número, mantenerlo (incluso 0 es válido)
    if (typeof value === 'number') {
      return value;
    }
    // Si es string y solo contiene espacios, convertir a null
    if (typeof value === 'string' && value.trim() === '') {
      return null;
    }
    return value;
  }

  // Helper para eliminar archivo antiguo
  private deleteFile(filename: string): void {
    if (!filename) return;
    
    const filePath = path.join(process.cwd(), 'uploads', 'trabajadores', filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.error('Error al eliminar archivo:', error);
      }
    }
  }

  async findAll() {
    const trabajadores = await this.trabajadorCentroRepository.find({
      relations: ['rol', 'especialidad', 'cargo', 'sexo', 'estado_civil', 'parentesco_emergencia', 'distrito_rel', 'distrito_rel.provincia', 'nivel_educacion', 'jefe']
    });

    return trabajadores.map(trabajador => {
    
      const { password, ...trabajadorSinPassword } = trabajador;
      return trabajadorSinPassword;
    });
  }

  async findAllForSelect(): Promise<{ id: number; nombre_completo: string; cargo: string; rol_id: number | null }[]> {
    const trabajadores = await this.trabajadorCentroRepository.find({
      select: ['id', 'nombres', 'apellidos'],
      where: { estado: true },
      relations: ['cargo', 'rol'],
      order: { apellidos: 'ASC', nombres: 'ASC' }
    });

    return trabajadores.map(trabajador => ({
      id: trabajador.id,
      nombre_completo: `${trabajador.nombres} ${trabajador.apellidos}`.trim(),
      cargo: trabajador.cargo?.nombre || 'Sin cargo',
      rol_id: trabajador.rol?.id ?? null,
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
      correo_corporativo: this.toNullIfEmpty(dto.correo_corporativo),
      estado: true,
      telefono: this.toNullIfEmpty(dto.telefono),
      telefono_emergencia: this.toNullIfEmpty(dto.telefono_emergencia),
      contacto_emergencia: this.toNullIfEmpty(dto.contacto_emergencia),
      direccion: this.toNullIfEmpty(dto.direccion),
      distrito: this.toNullIfEmpty(dto.distrito),
      provincia: this.toNullIfEmpty(dto.provincia),
      departamento: this.toNullIfEmpty(dto.departamento),
      talla_polo: this.toNullIfEmpty(dto.talla_polo),
      talla_pantalon: this.toNullIfEmpty(dto.talla_pantalon),
      talla_zapatos: this.toNullIfEmpty(dto.talla_zapatos),
      numero_colegiatura: this.toNullIfEmpty(dto.numero_colegiatura),
      // Datos personales adicionales
      fecha_nacimiento: this.toNullIfEmpty(dto.fecha_nacimiento) as any,
      hijos: this.toNullIfEmpty(dto.hijos),
      // Datos de contacto adicionales
      pais: this.toNullIfEmpty(dto.pais),
      referencia_direccion: this.toNullIfEmpty(dto.referencia_direccion),
      // Datos laborales adicionales
      procedencia_laboral: this.toNullIfEmpty(dto.procedencia_laboral),
      area_laboral: this.toNullIfEmpty(dto.area_laboral),
      empresa_anterior: this.toNullIfEmpty(dto.empresa_anterior),
      motivo_renuncia: this.toNullIfEmpty(dto.motivo_renuncia),
      // Datos adicionales
      hobbies: this.toNullIfEmpty(dto.hobbies),
   
      // Archivos adjuntos
      archivo_cv: this.toNullIfEmpty(dto.archivo_cv),
      archivo_dni: this.toNullIfEmpty(dto.archivo_dni),
      // Campos RRHH
      sueldo_base: this.toNullIfEmpty(dto.sueldo_base),
      fecha_ingreso: this.toNullIfEmpty(dto.fecha_ingreso) as any,
      numero_cuenta: this.toNullIfEmpty(dto.numero_cuenta),
      banco: this.toNullIfEmpty(dto.banco),
      // Relaciones
      rol: this.toNullIfEmpty(dto.rol_id) ? { id: dto.rol_id } : null,
      especialidad: this.toNullIfEmpty(dto.especialidad_id) ? { id: dto.especialidad_id } : null,
      institucion: this.toNullIfEmpty(dto.institucion_id) ? { id: dto.institucion_id } : null,
      cargo: this.toNullIfEmpty(dto.cargo_id) ? { id: dto.cargo_id } : null,
      jefe: this.toNullIfEmpty(dto.jefe_id) ? { id: dto.jefe_id } : null,
      sexo: this.toNullIfEmpty(dto.sexo_id) ? { id: dto.sexo_id } : null,
      estado_civil: this.toNullIfEmpty(dto.estado_civil_id) ? { id: dto.estado_civil_id } : null,
      parentesco_emergencia: this.toNullIfEmpty(dto.parentesco_emergencia_id) ? { id: dto.parentesco_emergencia_id } : null,
      // Nuevos campos
      distrito_id: this.toNullIfEmpty(dto.distrito_id),
      nivel_educacion: this.toNullIfEmpty(dto.nivel_educacion_id) ? { id: dto.nivel_educacion_id } : null,
      centro_estudios_principal: this.toNullIfEmpty(dto.centro_estudios_principal),
      carrera_estudiada_principal: this.toNullIfEmpty(dto.carrera_estudiada_principal),
      fecha_inicio_estudio: this.toNullIfEmpty(dto.fecha_inicio_estudio) as any,
      fecha_termino_estudio: this.toNullIfEmpty(dto.fecha_termino_estudio) as any,
      opciones_regalo: this.toNullIfEmpty(dto.opciones_regalo),
    });

    const trabajadorGuardado = await this.trabajadorCentroRepository.save(nuevoTrabajador);

    const trabajadorCompleto = await this.trabajadorCentroRepository.findOne({
      where: { id: trabajadorGuardado.id },
      relations: ['rol', 'especialidad', 'cargo', 'institucion', 'sexo', 'estado_civil', 'parentesco_emergencia', 'distrito_rel', 'distrito_rel.provincia', 'nivel_educacion']
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

 // trabajador-centro.service.ts

async update(id: number, dto: UpdateTrabajadorCentroDto): Promise<TrabajadorCentro> {
    const trabajador = await this.trabajadorCentroRepository.findOne({
      where: { id },
      relations: ['rol', 'especialidad', 'cargo']
    });

    if (!trabajador) {
      throw new NotFoundException(`Trabajador con ID ${id} no encontrado`);
    }

    const usuarioQueEdita = await this.trabajadorCentroRepository.findOne({
      where: { id: dto.user_id_actua },
      relations: ['rol']
    });

    if (!usuarioQueEdita) {
      throw new NotFoundException(`Usuario que edita (ID ${dto.user_id_actua}) no encontrado`);
    }

    const esAdmin = usuarioQueEdita?.rol?.nombre === 'Administrador';
    const esRRHH = usuarioQueEdita?.rol?.nombre === 'RRHH';
    const esPropioUsuario = usuarioQueEdita.id === id;
    const debeAplicarBloqueo = esPropioUsuario && !esAdmin && !esRRHH;

    // ✅ SI DEBE APLICAR BLOQUEO: Validar TODOS los campos que ya estén completos
    if (debeAplicarBloqueo) {
      const todosLosCampos = [
        'nombres', 'apellidos', 'dni', 'email', 'correo_corporativo',
        'telefono', 'telefono_emergencia', 'contacto_emergencia',
        'direccion', 'referencia_direccion', 'distrito', 'provincia', 'departamento', 'distrito_id',
        'talla_polo', 'talla_pantalon', 'talla_zapatos',
        'fecha_nacimiento', 'sexo_id', 'estado_civil_id', 'hijos', 'pais',
        'parentesco_emergencia_id', 'numero_colegiatura',
        'procedencia_laboral', 'area_laboral', 'empresa_anterior', 'motivo_renuncia',
        'nivel_educacion_id', 'centro_estudios_principal', 'carrera_estudiada_principal',
        'fecha_inicio_estudio', 'fecha_termino_estudio', 'hobbies', 'opciones_regalo',
        'archivo_cv', 'archivo_dni', 'especialidad_id'
      ];

      for (const campo of todosLosCampos) {
        // Si el campo viene en el DTO y ya está completo en BD
        if (dto[campo] !== undefined && trabajador[campo]) {
          throw new Error(
            `El campo '${campo}' ya está completo y no puede modificarse. Contacte al administrador si necesita cambiarlo.`
          );
        }
      }
    }

    const updateData: any = {};

    // ✅ Solo actualizar campos si NO están bloqueados (vacíos) o si es Admin/RRHH
    if (dto.nombres !== undefined && (!debeAplicarBloqueo || !trabajador.nombres)) {
      updateData.nombres = dto.nombres;
    }
    if (dto.apellidos !== undefined && (!debeAplicarBloqueo || !trabajador.apellidos)) {
      updateData.apellidos = dto.apellidos;
    }
    if (dto.dni !== undefined && (!debeAplicarBloqueo || !trabajador.dni)) {
      updateData.dni = dto.dni;
    }
    if (dto.username !== undefined && (!debeAplicarBloqueo || !trabajador.username)) {
      updateData.username = dto.username;
    }
    if (dto.email !== undefined && (!debeAplicarBloqueo || !trabajador.email)) {
      updateData.email = dto.email;
    }
    if (dto.correo_corporativo !== undefined && (!debeAplicarBloqueo || !trabajador.correo_corporativo)) {
      updateData.correo_corporativo = dto.correo_corporativo;
    }
    if (dto.telefono !== undefined && (!debeAplicarBloqueo || !trabajador.telefono)) {
      updateData.telefono = dto.telefono;
    }
    if (dto.telefono_emergencia !== undefined && (!debeAplicarBloqueo || !trabajador.telefono_emergencia)) {
      updateData.telefono_emergencia = dto.telefono_emergencia;
    }
    if (dto.contacto_emergencia !== undefined && (!debeAplicarBloqueo || !trabajador.contacto_emergencia)) {
      updateData.contacto_emergencia = dto.contacto_emergencia;
    }
    if (dto.direccion !== undefined && (!debeAplicarBloqueo || !trabajador.direccion)) {
      updateData.direccion = dto.direccion;
    }
    if (dto.referencia_direccion !== undefined && (!debeAplicarBloqueo || !trabajador.referencia_direccion)) {
      updateData.referencia_direccion = dto.referencia_direccion;
    }
    if (dto.departamento !== undefined && (!debeAplicarBloqueo || !trabajador.departamento)) {
      updateData.departamento = dto.departamento;
    }
    if (dto.talla_polo !== undefined && (!debeAplicarBloqueo || !trabajador.talla_polo)) {
      updateData.talla_polo = dto.talla_polo;
    }
    if (dto.talla_pantalon !== undefined && (!debeAplicarBloqueo || !trabajador.talla_pantalon)) {
      updateData.talla_pantalon = dto.talla_pantalon;
    }
    if (dto.talla_zapatos !== undefined && (!debeAplicarBloqueo || !trabajador.talla_zapatos)) {
      updateData.talla_zapatos = dto.talla_zapatos;
    }
    if (dto.fecha_nacimiento !== undefined && (!debeAplicarBloqueo || !trabajador.fecha_nacimiento)) {
      updateData.fecha_nacimiento = dto.fecha_nacimiento;
    }
    if (dto.hijos !== undefined && (!debeAplicarBloqueo || !trabajador.hijos)) {
      updateData.hijos = dto.hijos;
    }
    if (dto.pais !== undefined && (!debeAplicarBloqueo || !trabajador.pais)) {
      updateData.pais = dto.pais;
    }
    if (dto.procedencia_laboral !== undefined && (!debeAplicarBloqueo || !trabajador.procedencia_laboral)) {
      updateData.procedencia_laboral = dto.procedencia_laboral;
    }
    if (dto.area_laboral !== undefined && (!debeAplicarBloqueo || !trabajador.area_laboral)) {
      updateData.area_laboral = dto.area_laboral;
    }
    if (dto.empresa_anterior !== undefined && (!debeAplicarBloqueo || !trabajador.empresa_anterior)) {
      updateData.empresa_anterior = dto.empresa_anterior;
    }
    if (dto.motivo_renuncia !== undefined && (!debeAplicarBloqueo || !trabajador.motivo_renuncia)) {
      updateData.motivo_renuncia = dto.motivo_renuncia;
    }
    if (dto.centro_estudios_principal !== undefined && (!debeAplicarBloqueo || !trabajador.centro_estudios_principal)) {
      updateData.centro_estudios_principal = dto.centro_estudios_principal;
    }
    if (dto.carrera_estudiada_principal !== undefined && (!debeAplicarBloqueo || !trabajador.carrera_estudiada_principal)) {
      updateData.carrera_estudiada_principal = dto.carrera_estudiada_principal;
    }
    if (dto.fecha_inicio_estudio !== undefined && (!debeAplicarBloqueo || !trabajador.fecha_inicio_estudio)) {
      updateData.fecha_inicio_estudio = dto.fecha_inicio_estudio;
    }
    if (dto.fecha_termino_estudio !== undefined && (!debeAplicarBloqueo || !trabajador.fecha_termino_estudio)) {
      updateData.fecha_termino_estudio = dto.fecha_termino_estudio;
    }
    if (dto.hobbies !== undefined && (!debeAplicarBloqueo || !trabajador.hobbies)) {
      updateData.hobbies = dto.hobbies;
    }
    if (dto.opciones_regalo !== undefined && (!debeAplicarBloqueo || !trabajador.opciones_regalo)) {
      updateData.opciones_regalo = dto.opciones_regalo;
    }
    if (dto.archivo_cv !== undefined && (!debeAplicarBloqueo || !trabajador.archivo_cv)) {
      updateData.archivo_cv = dto.archivo_cv;
    }
    if (dto.archivo_dni !== undefined && (!debeAplicarBloqueo || !trabajador.archivo_dni)) {
      updateData.archivo_dni = dto.archivo_dni;
    }
    if (dto.numero_colegiatura !== undefined && (!debeAplicarBloqueo || !trabajador.numero_colegiatura)) {
      updateData.numero_colegiatura = dto.numero_colegiatura;
    }
    if (dto.sueldo_base !== undefined) updateData.sueldo_base = dto.sueldo_base;
    if (dto.fecha_ingreso !== undefined) updateData.fecha_ingreso = dto.fecha_ingreso;
    if (dto.numero_cuenta !== undefined) updateData.numero_cuenta = dto.numero_cuenta;
    if (dto.banco !== undefined) updateData.banco = dto.banco;

    // Ubicación
    if (dto.distrito_id !== undefined) {
      if (dto.distrito_id) {
        const distritoRepository = this.trabajadorCentroRepository.manager.getRepository(Distrito);
        const distrito = await distritoRepository.findOne({
          where: { id: dto.distrito_id },
          relations: ['provincia']
        });

        if (distrito) {
          updateData.distrito_rel = distrito;
          updateData.distrito_id = dto.distrito_id;
          updateData.distrito = distrito.nombre;
          updateData.provincia = distrito.provincia?.nombre || null;
          updateData.departamento = distrito.provincia?.region || null;
        }
      } else {
        updateData.distrito_rel = null;
        updateData.distrito_id = null;
        updateData.distrito = null;
        updateData.provincia = null;
        updateData.departamento = null;
      }
    }

    // Relaciones
    if (dto.rol_id !== undefined) updateData.rol = dto.rol_id ? { id: dto.rol_id } : null;
    if (dto.especialidad_id !== undefined && (!debeAplicarBloqueo || !trabajador.especialidad)) {
      updateData.especialidad = dto.especialidad_id ? { id: dto.especialidad_id } : null;
    }
    if (dto.cargo_id !== undefined) updateData.cargo = dto.cargo_id ? { id: dto.cargo_id } : null;
    if (dto.jefe_id !== undefined) updateData.jefe = dto.jefe_id ? { id: dto.jefe_id } : null;
    if (dto.institucion_id !== undefined) updateData.institucion = dto.institucion_id ? { id: dto.institucion_id } : null;
    if (dto.sexo_id !== undefined && (!debeAplicarBloqueo || !trabajador.sexo)) {
      updateData.sexo = dto.sexo_id ? { id: dto.sexo_id } : null;
    }
    if (dto.estado_civil_id !== undefined && (!debeAplicarBloqueo || !trabajador.estado_civil)) {
      updateData.estado_civil = dto.estado_civil_id ? { id: dto.estado_civil_id } : null;
    }
    if (dto.parentesco_emergencia_id !== undefined && (!debeAplicarBloqueo || !trabajador.parentesco_emergencia)) {
      updateData.parentesco_emergencia = dto.parentesco_emergencia_id ? { id: dto.parentesco_emergencia_id } : null;
    }
    if (dto.nivel_educacion_id !== undefined && (!debeAplicarBloqueo || !trabajador.nivel_educacion)) {
      updateData.nivel_educacion = dto.nivel_educacion_id ? { id: dto.nivel_educacion_id } : null;
    }

    // Password
    if (dto.password !== undefined && dto.password !== null && dto.password.trim() !== '') {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    Object.assign(trabajador, updateData);
    const resultado = await this.trabajadorCentroRepository.save(trabajador);

    const trabajadorActualizado = await this.trabajadorCentroRepository.findOne({
      where: { id },
      relations: ['rol', 'especialidad', 'cargo', 'sexo', 'estado_civil', 'parentesco_emergencia', 'distrito_rel', 'distrito_rel.provincia', 'nivel_educacion', 'jefe']
    });

    const { password, ...trabajadorSinPassword } = trabajadorActualizado;
    return trabajadorSinPassword as TrabajadorCentro;
  }

async getCamposBloqueados(id: number) {
  // ¡IMPORTANTE! Cargar todas las relaciones necesarias
  const trabajador = await this.trabajadorCentroRepository.findOne({ 
    where: { id },
    relations: ['sexo', 'estado_civil', 'parentesco_emergencia', 'nivel_educacion', 'especialidad']
  });
  
  if (!trabajador) throw new NotFoundException('Trabajador no encontrado');

  const camposBloqueables = [
    'nombres', 'apellidos', 'dni', 'fecha_nacimiento', 'sexo_id', 'estado_civil_id', 'hijos', 'pais',
    'email', 'correo_corporativo', 'telefono', 'telefono_emergencia', 'contacto_emergencia', 'parentesco_emergencia_id',
    'direccion', 'referencia_direccion', 'distrito', 'distrito_id', 'provincia', 'departamento',
    'talla_polo', 'talla_pantalon', 'talla_zapatos',
    'numero_colegiatura', 'procedencia_laboral', 'area_laboral', 'empresa_anterior', 'motivo_renuncia',
    'nivel_educacion_id', 'centro_estudios_principal', 'carrera_estudiada_principal',
    'fecha_inicio_estudio', 'fecha_termino_estudio', 'hobbies', 'opciones_regalo',
    'archivo_cv', 'archivo_dni', 'especialidad_id'
  ];

  const estadoCampos = {};
  for (const campo of camposBloqueables) {
    let valor;
    
    // Para campos de relación, verificar el objeto relacionado
    if (campo === 'sexo_id') {
      valor = trabajador.sexo ? true : false;
    } else if (campo === 'estado_civil_id') {
      valor = trabajador.estado_civil ? true : false;
    } else if (campo === 'parentesco_emergencia_id') {
      valor = trabajador.parentesco_emergencia ? true : false;
    } else if (campo === 'nivel_educacion_id') {
      valor = trabajador.nivel_educacion ? true : false;
    } else if (campo === 'especialidad_id') {
      valor = trabajador.especialidad ? true : false;
    } else {
      // Para campos normales
      valor = trabajador[campo];
    }
    
    // Asignar el valor (para campos de relación es booleano, para otros es string/number)
    if (campo.includes('_id')) {
      // Para campos de relación ID
      estadoCampos[campo] = valor; // valor ya es booleano
    } else {
      // Para campos normales
      estadoCampos[campo] = valor && valor.toString().trim() !== '';
    }
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
      relations: ['rol', 'especialidad', 'cargo', 'sexo', 'estado_civil', 'parentesco_emergencia', 'distrito_rel', 'distrito_rel.provincia', 'nivel_educacion']
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

  async getCumpleanos() {
    const hoy = new Date();
    const mesHoy = hoy.getMonth() + 1;
    const diaHoy = hoy.getDate();
    const anioHoy = hoy.getFullYear();

    const trabajadores = await this.trabajadorCentroRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.cargo', 'cargo')
      .where('t.fecha_nacimiento IS NOT NULL')
      .andWhere('t.estado = :estado', { estado: true })
      .select([
        't.id', 't.nombres', 't.apellidos', 't.fecha_nacimiento',
        't.opciones_regalo',
        'cargo.id', 'cargo.nombre',
      ])
      .getMany();

    return trabajadores.map(t => {
      // Parsear directo del string para evitar desfase UTC→local
      const [anioFnac, mesFnac, diaFnac] = String(t.fecha_nacimiento).substring(0, 10).split('-').map(Number);

      // Edad que cumple este año
      let edadEsteAnio = anioHoy - anioFnac;

      // Días hasta el próximo cumpleaños
      let proximoCumple = new Date(anioHoy, mesFnac - 1, diaFnac);
      if (proximoCumple < hoy) {
        proximoCumple = new Date(anioHoy + 1, mesFnac - 1, diaFnac);
        edadEsteAnio++;
      }
      const diffMs = proximoCumple.getTime() - hoy.setHours(0, 0, 0, 0);
      const diasRestantes = Math.round(diffMs / (1000 * 60 * 60 * 24));

      // Es hoy?
      const esHoy = mesFnac === mesHoy && diaFnac === diaHoy;

      return {
        id: t.id,
        nombres: t.nombres,
        apellidos: t.apellidos,
        fecha_nacimiento: t.fecha_nacimiento,
        dia: diaFnac,
        mes: mesFnac,
        edad: edadEsteAnio,
        dias_restantes: diasRestantes,
        es_hoy: esHoy,
        opciones_regalo: t.opciones_regalo,
        cargo: t.cargo?.nombre ?? null,
      };
    }).sort((a, b) => a.dias_restantes - b.dias_restantes);
  }

  async findAllForRRHH(estado?: string) {
    const query = this.trabajadorCentroRepository
      .createQueryBuilder('trabajador')
      .leftJoinAndSelect('trabajador.cargo', 'cargo')
      .leftJoinAndSelect('trabajador.distrito_rel', 'distrito_rel')
      .leftJoinAndSelect('distrito_rel.provincia', 'provincia')
      .orderBy('trabajador.created_at', 'DESC');

    if (estado === 'activo') {
      query.where('trabajador.estado = :estado', { estado: true });
    } else if (estado === 'inactivo') {
      query.where('trabajador.estado = :estado', { estado: false });
    }

    const trabajadores = await query.getMany();

    return trabajadores.map(({ password, ...trabajador }) => {
    
      

      return {
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
      };
  });}

  async remove(id: number): Promise<void> {
    const trabajador = await this.trabajadorCentroRepository.findOne({ where: { id } });
    if (!trabajador) {
      throw new NotFoundException(`Trabajador con ID ${id} no encontrado`);
    }

    // Eliminar archivos asociados antes de eliminar el registro
    if (trabajador.archivo_cv) {
      this.deleteFile(trabajador.archivo_cv);
    }
    if (trabajador.archivo_dni) {
      this.deleteFile(trabajador.archivo_dni);
    }

    await this.trabajadorCentroRepository.remove(trabajador);
  }

async eliminarArchivo(id: number, tipo: 'cv' | 'dni') {
  const trabajador = await this.trabajadorCentroRepository.findOne({ 
    where: { id } 
  });
  
  if (!trabajador) {
    throw new NotFoundException('Trabajador no encontrado');
  }

  const campo = tipo === 'cv' ? 'archivo_cv' : 'archivo_dni';
  const nombreArchivo = trabajador[campo];

  if (!nombreArchivo) {
    throw new BadRequestException(`No existe archivo de ${tipo.toUpperCase()} para eliminar`);
  }

  // Eliminar archivo físico
  this.deleteFile(nombreArchivo);

  // ✅ CORRECCIÓN: Usar update para asegurar que se guarde el cambio
  await this.trabajadorCentroRepository.update(id, { [campo]: null });

  // También actualizar el objeto local para consistencia
  trabajador[campo] = null;

  return {
    message: `Archivo de ${tipo.toUpperCase()} eliminado exitosamente`,
    campo,
    archivoEliminado: nombreArchivo
  };
}

/**
 * Obtener solo terapeutas (rol_id = 4) activos
 */
async findTerapeutas(): Promise<any[]> {
  const terapeutas = await this.trabajadorCentroRepository.find({
    where: {
      estado: true
    },
    relations: ['rol'],
    select: ['id', 'nombres', 'apellidos', 'email', 'telefono'],
    order: { apellidos: 'ASC', nombres: 'ASC' }
  });

  // Filtrar solo terapeutas (rol_id = 4)
  return terapeutas.filter(t => t.rol?.id === 4);
}

async findSubordinados(jefeId: number): Promise<{ id: number; nombres: string; apellidos: string }[]> {
  return this.trabajadorCentroRepository.find({
    where: {
      jefe: { id: jefeId },
      estado: true,
    },
    relations: ['jefe'],
    select: ['id', 'nombres', 'apellidos'],
    order: { apellidos: 'ASC', nombres: 'ASC' },
  });
}
}