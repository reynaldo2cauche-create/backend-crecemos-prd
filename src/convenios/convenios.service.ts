// src/convenios/convenios.service.ts
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Convenio } from './entities/convenio.entity';
import { PacienteConvenio } from './entities/paciente-convenio.entity';
import { Beneficio } from './entities/beneficio.entity';
import { CategoriaBeneficio } from './entities/categoria-beneficio.entity';
import { CreateConvenioDto } from './dto/create-convenio.dto';
import { UpdateConvenioDto } from './dto/update-convenio.dto';
import { CreatePacienteConvenioDto } from './dto/create-paciente-convenio.dto';
import { UpdatePacienteConvenioDto } from './dto/update-paciente-convenio.dto';
import { CreateBeneficioDto } from './dto/create-beneficio.dto';
import { UpdateBeneficioDto } from './dto/update-beneficio.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ConveniosService {
  private readonly uploadPath = 'uploads/convenios';

  constructor(
    @InjectRepository(Convenio)
    private readonly convenioRepo: Repository<Convenio>,
    @InjectRepository(PacienteConvenio)
    private readonly pacienteConvenioRepo: Repository<PacienteConvenio>,
    @InjectRepository(Beneficio)
    private readonly beneficioRepo: Repository<Beneficio>,
    @InjectRepository(CategoriaBeneficio)
    private readonly categoriaBeneficioRepo: Repository<CategoriaBeneficio>,
  ) {
    // Crear carpeta de uploads si no existe
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  // =============== CONVENIOS ===============

  async create(dto: CreateConvenioDto, userId?: number, file?: Express.Multer.File): Promise<Convenio> {
    try {
      console.log('📝 [CREATE] Iniciando creación de convenio');
      console.log('📝 [CREATE] DTO recibido:', JSON.stringify(dto));
      console.log('📝 [CREATE] userId:', userId);
      console.log('📝 [CREATE] file:', file ? file.filename : 'Sin archivo');

      let logoUrl = null;

      // Si se subió un archivo, guardar solo el filename (como el popup)
      if (file) {
        logoUrl = file.filename;
        console.log('✅ [CREATE] Logo guardado:', logoUrl);
      }

      const convenioData = {
        ...dto,
        logo_url: logoUrl,
        user_id_crea: userId,
        user_id_actua: userId,
      };

      console.log('📦 [CREATE] Datos finales para crear:', JSON.stringify(convenioData));

      const convenio = this.convenioRepo.create(convenioData);
      console.log('🔨 [CREATE] Entidad creada (antes de save):', JSON.stringify(convenio));

      const resultado = await this.convenioRepo.save(convenio);
      console.log('✅ [CREATE] Convenio guardado exitosamente con ID:', resultado.id);

      return resultado;
    } catch (error) {
      console.error('❌ [CREATE] Error al crear convenio:', error);
      console.error('❌ [CREATE] Error stack:', error.stack);
      console.error('❌ [CREATE] Error message:', error.message);
      throw error;
    }
  }

  async findAll(activo?: boolean): Promise<Convenio[]> {
    const where: any = {};
    if (activo !== undefined) {
      where.activo = activo;
    }

    return await this.convenioRepo.find({
      where,
      order: { empresa: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Convenio> {
    const convenio = await this.convenioRepo.findOne({ 
      where: { id },
      relations: ['pacienteConvenios']
    });

    if (!convenio) {
      throw new NotFoundException(`Convenio con ID ${id} no encontrado`);
    }

    return convenio;
  }

  async update(
    id: number, 
    dto: UpdateConvenioDto, 
    userId?: number, 
    file?: Express.Multer.File
  ): Promise<Convenio> {
    const convenio = await this.findOne(id);
    
    // Si se subió un nuevo archivo
    if (file) {
      // Eliminar el logo anterior si existe
      if (convenio.logo_url) {
        await this.deleteLogo(convenio.logo_url);
      }
      // Asignar solo el filename (como el popup)
      dto.logo_url = file.filename;
      console.log('Logo actualizado:', dto.logo_url);
    }

    Object.assign(convenio, dto);
    convenio.user_id_actua = userId;

    return await this.convenioRepo.save(convenio);
  }

  async remove(id: number): Promise<void> {
    const convenio = await this.findOne(id);
    
    // Verificar si tiene pacientes asociados
    const pacientesCount = await this.pacienteConvenioRepo.count({ 
      where: { convenio_id: id } 
    });

    if (pacientesCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar el convenio porque tiene ${pacientesCount} paciente(s) asociado(s)`
      );
    }

    // Eliminar logo si existe
    if (convenio.logo_url) {
      await this.deleteLogo(convenio.logo_url);
    }

    await this.convenioRepo.remove(convenio);
  }

  async setEstado(id: number, activo: boolean, userId?: number): Promise<Convenio> {
    const convenio = await this.findOne(id);
    convenio.activo = activo;
    convenio.user_id_actua = userId;
    return await this.convenioRepo.save(convenio);
  }

  // =============== HELPER METHODS ===============

  private async deleteLogo(logoUrl: string): Promise<void> {
    if (!logoUrl) return;

    try {
      // Extraer nombre de archivo de la URL
      const filename = path.basename(logoUrl);
      const filepath = path.join(this.uploadPath, filename);

      // Eliminar archivo si existe
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log('Logo eliminado:', filepath);
      }
    } catch (error) {
      console.error('Error al eliminar logo:', error);
    }
  }

  // =============== PACIENTE-CONVENIO ===============

  async asignarConvenioAPaciente(dto: CreatePacienteConvenioDto, userId?: number): Promise<PacienteConvenio> {
    // Buscar si existe un registro (activo o inactivo)
    const existente = await this.pacienteConvenioRepo.findOne({
      where: {
        paciente_id: dto.paciente_id,
        convenio_id: dto.convenio_id,
      },
    });

    // Si existe y está ACTIVO: error
    if (existente && existente.activo) {
      throw new ConflictException('El paciente ya está asignado a este convenio');
    }

    // Si existe pero está INACTIVO: REACTIVARLO
    if (existente && !existente.activo) {
      existente.activo = true;
      if (dto.fecha_inicio) {
        existente.fecha_inicio = typeof dto.fecha_inicio === 'string'
          ? new Date(dto.fecha_inicio)
          : dto.fecha_inicio;
      }
      if (dto.fecha_fin) {
        existente.fecha_fin = typeof dto.fecha_fin === 'string'
          ? new Date(dto.fecha_fin)
          : dto.fecha_fin;
      }
      if (dto.observaciones) {
        existente.observaciones = dto.observaciones;
      }
      existente.user_id_actua = userId;

      return await this.pacienteConvenioRepo.save(existente);
    }

    // Si NO existe: crear nuevo
    const pacienteConvenio = this.pacienteConvenioRepo.create({
      ...dto,
      user_id_crea: userId,
      user_id_actua: userId,
    });

    return await this.pacienteConvenioRepo.save(pacienteConvenio);
  }

  async findConveniosByPaciente(pacienteId: number): Promise<PacienteConvenio[]> {
    return await this.pacienteConvenioRepo.find({
      where: {
        paciente_id: pacienteId,
        activo: true // Solo mostrar convenios activos
      },
      order: { created_at: 'DESC' },
    });
  }

  async findPacientesByConvenio(convenioId: number, activo?: boolean): Promise<PacienteConvenio[]> {
    const where: any = { convenio_id: convenioId };
    if (activo !== undefined) {
      where.activo = activo;
    }

    return await this.pacienteConvenioRepo.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  async findOnePacienteConvenio(id: number): Promise<PacienteConvenio> {
    const pacienteConvenio = await this.pacienteConvenioRepo.findOne({ 
      where: { id } 
    });

    if (!pacienteConvenio) {
      throw new NotFoundException(`Relación paciente-convenio con ID ${id} no encontrada`);
    }

    return pacienteConvenio;
  }

  async updatePacienteConvenio(
    id: number, 
    dto: UpdatePacienteConvenioDto, 
    userId?: number
  ): Promise<PacienteConvenio> {
    const pacienteConvenio = await this.findOnePacienteConvenio(id);
    
    Object.assign(pacienteConvenio, dto);
    pacienteConvenio.user_id_actua = userId;

    return await this.pacienteConvenioRepo.save(pacienteConvenio);
  }

  async removePacienteConvenio(id: number): Promise<void> {
    const pacienteConvenio = await this.findOnePacienteConvenio(id);
    await this.pacienteConvenioRepo.remove(pacienteConvenio);
  }

  async setEstadoPacienteConvenio(
    id: number,
    activo: boolean,
    userId?: number
  ): Promise<PacienteConvenio> {
    const pacienteConvenio = await this.findOnePacienteConvenio(id);
    pacienteConvenio.activo = activo;
    pacienteConvenio.user_id_actua = userId;
    return await this.pacienteConvenioRepo.save(pacienteConvenio);
  }

  // =============== BENEFICIOS ===============

  async createBeneficio(dto: CreateBeneficioDto, userId?: number): Promise<Beneficio> {
    // Verificar que el convenio existe
    const convenio = await this.convenioRepo.findOne({ where: { id: dto.convenio_id } });
    if (!convenio) {
      throw new NotFoundException(`Convenio con ID ${dto.convenio_id} no encontrado`);
    }

    // Crear el beneficio con la relación directa al convenio
    const beneficio = this.beneficioRepo.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      categoria_id: dto.categoria_id,
      descuento: dto.descuento,
      convenio_id: dto.convenio_id,
      activo: dto.activo !== undefined ? dto.activo : true,
      user_id_crea: userId,
      user_id_actua: userId,
    });

    const beneficioGuardado = await this.beneficioRepo.save(beneficio);

    // Retornar el beneficio con su convenio y categoria
    return await this.beneficioRepo.findOne({
      where: { id: beneficioGuardado.id },
      relations: ['convenio', 'categoria']
    });
  }

  async findAllBeneficios(activo?: boolean, convenio_id?: number): Promise<Beneficio[]> {
    console.log('🔍 findAllBeneficios - activo:', activo, 'convenio_id:', convenio_id);

    try {
      const where: any = {};

      // Filtrar por estado activo si se especifica
      if (typeof activo === 'boolean') {
        where.activo = activo;
        console.log('📌 Filtrando por activo =', activo);
      }

      // Filtrar por convenio_id si se especifica
      if (convenio_id) {
        where.convenio_id = convenio_id;
      }

      console.log('🔎 WHERE clause:', JSON.stringify(where));

      const beneficios = await this.beneficioRepo.find({
        where,
        relations: ['convenio', 'categoria'],
        order: { nombre: 'ASC' }
      });

      console.log('✅ Beneficios encontrados:', beneficios.length);
      console.log('📋 Detalle de beneficios:', beneficios.map(b => ({
        id: b.id,
        nombre: b.nombre,
        activo: b.activo
      })));
      return beneficios;
    } catch (error) {
      console.error('❌ Error en findAllBeneficios:', error.message);
      throw error;
    }
  }

  async findOneBeneficio(id: number): Promise<Beneficio> {
    const beneficio = await this.beneficioRepo.findOne({
      where: { id },
      relations: ['convenio', 'categoria']
    });

    if (!beneficio) {
      throw new NotFoundException(`Beneficio con ID ${id} no encontrado`);
    }

    return beneficio;
  }

  async updateBeneficio(
    id: number,
    dto: UpdateBeneficioDto,
    userId?: number
  ): Promise<Beneficio> {
    console.log('🔄 [SERVICE] updateBeneficio - ID:', id);
    console.log('📦 [SERVICE] DTO recibido:', dto);

    // Verificar que el beneficio existe
    const beneficioExiste = await this.beneficioRepo.findOne({ where: { id } });
    if (!beneficioExiste) {
      throw new NotFoundException(`Beneficio con ID ${id} no encontrado`);
    }

    // Si se está cambiando el convenio, verificar que existe
    if (dto.convenio_id) {
      const convenio = await this.convenioRepo.findOne({ where: { id: dto.convenio_id } });
      if (!convenio) {
        throw new NotFoundException(`Convenio con ID ${dto.convenio_id} no encontrado`);
      }
      console.log('✅ [SERVICE] Convenio encontrado:', convenio.empresa);
    }

    // USAR UPDATE DIRECTO en lugar de save() para evitar problemas con relaciones
    const updateData: any = {};
    if (dto.nombre !== undefined) updateData.nombre = dto.nombre;
    if (dto.descripcion !== undefined) updateData.descripcion = dto.descripcion;
    if (dto.descuento !== undefined) updateData.descuento = dto.descuento;
    if (dto.categoria_id !== undefined) updateData.categoria_id = dto.categoria_id;
    if (dto.convenio_id !== undefined) updateData.convenio_id = dto.convenio_id;
    if (userId !== undefined) updateData.user_id_actua = userId;

    console.log('📝 [SERVICE] Datos a actualizar:', updateData);

    // Ejecutar UPDATE directo
    await this.beneficioRepo.update(id, updateData);

    console.log('✅ [SERVICE] UPDATE ejecutado');

    // VERIFICAR en la BD con query RAW
    const rawCheck = await this.beneficioRepo.query(
      'SELECT id, nombre, convenio_id, categoria_id FROM beneficios WHERE id = ?',
      [id]
    );
    console.log('🔍 [SERVICE] Verificación RAW SQL en BD:', rawCheck[0]);

    // Retornar el beneficio actualizado con relaciones
    const resultado = await this.beneficioRepo
      .createQueryBuilder('beneficio')
      .leftJoinAndSelect('beneficio.convenio', 'convenio')
      .leftJoinAndSelect('beneficio.categoria', 'categoria')
      .where('beneficio.id = :id', { id })
      .getOne();

    console.log('🎁 [SERVICE] Beneficio final:', {
      id: resultado.id,
      nombre: resultado.nombre,
      convenio_id: resultado.convenio_id,
      convenio_nombre: resultado.convenio?.empresa
    });

    return resultado;
  }

  async removeBeneficio(id: number): Promise<void> {
    const beneficio = await this.findOneBeneficio(id);
    await this.beneficioRepo.remove(beneficio);
  }

  async setEstadoBeneficio(id: number, activo: boolean, userId?: number): Promise<Beneficio> {
    const beneficio = await this.findOneBeneficio(id);
    beneficio.activo = activo;
    beneficio.user_id_actua = userId;
    return await this.beneficioRepo.save(beneficio);
  }

  // =============== CATEGORÍAS DE BENEFICIOS ===============

  async findAllCategoriasBeneficios(): Promise<CategoriaBeneficio[]> {
    return await this.categoriaBeneficioRepo.find({
      order: { nombre: 'ASC' }
    });
  }

  async findOneCategoriaBeneficio(id: number): Promise<CategoriaBeneficio> {
    const categoria = await this.categoriaBeneficioRepo.findOne({ where: { id } });
    if (!categoria) {
      throw new NotFoundException(`Categoría de beneficio con ID ${id} no encontrada`);
    }
    return categoria;
  }

}