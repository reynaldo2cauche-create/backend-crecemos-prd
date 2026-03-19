import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { LibroReclamacion } from './entities/reclamo.entity';
import { LibroReclamacionesEstado } from './entities/estado.entity';
import { LibroReclamacionesTipoSolicitud } from './entities/tipo-solicitud.entity';
import { LibroReclamacionesTipoBien } from './entities/tipo-bien.entity';
import { LibroReclamacionesDocumento } from './entities/documento.entity';
import { LibroReclamacionesSeguimiento } from './entities/seguimiento.entity';
import { LibroReclamacionesConfig } from './entities/config.entity';
import { CrearReclamoDto } from './dto/crear-reclamo.dto';
import { ResponderReclamoDto } from './dto/responder-reclamo.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { FiltrarReclamosDto } from './dto/filtrar-reclamos.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class LibroReclamacionesService {
  constructor(
    @InjectRepository(LibroReclamacion)
    private reclamoRepo: Repository<LibroReclamacion>,
    @InjectRepository(LibroReclamacionesEstado)
    private estadoRepo: Repository<LibroReclamacionesEstado>,
    @InjectRepository(LibroReclamacionesTipoSolicitud)
    private tipoSolicitudRepo: Repository<LibroReclamacionesTipoSolicitud>,
    @InjectRepository(LibroReclamacionesTipoBien)
    private tipoBienRepo: Repository<LibroReclamacionesTipoBien>,
    @InjectRepository(LibroReclamacionesDocumento)
    private documentoRepo: Repository<LibroReclamacionesDocumento>,
    @InjectRepository(LibroReclamacionesSeguimiento)
    private seguimientoRepo: Repository<LibroReclamacionesSeguimiento>,
    @InjectRepository(LibroReclamacionesConfig)
    private configRepo: Repository<LibroReclamacionesConfig>,
    private mailService: MailService,
  ) {}

  // ========================================
  // CREAR RECLAMO (PÚBLICO)
  // ========================================
  async crearReclamo(dto: CrearReclamoDto, ipRegistro: string, userAgent: string): Promise<LibroReclamacion> {
    // Generar código único
    const codigo = await this.generarCodigoReclamo();

    // Obtener estado inicial (Registrado)
    const estadoRegistrado = await this.estadoRepo.findOne({
      where: { nombre: 'Registrado' },
    });

    if (!estadoRegistrado) {
      throw new BadRequestException('No se encontró el estado inicial');
    }

    // Crear reclamo con evidencia técnica (IP y User Agent desde el backend)
    const reclamo = this.reclamoRepo.create({
      ...dto,
      codigo_reclamo: codigo,
      estado_id: estadoRegistrado.id,
      fecha_registro: new Date(),
      fecha_aceptacion: new Date(),
      ip_registro: ipRegistro,
      user_agent: userAgent,
    });

    const reclamoGuardado = await this.reclamoRepo.save(reclamo);

    // Registrar en seguimiento
    await this.registrarSeguimiento(
      reclamoGuardado.id,
      estadoRegistrado.id,
      'Reclamo registrado por el consumidor',
      null,
    );

    // NO enviamos correo aquí, el frontend lo hará después de generar el PDF
    return reclamoGuardado;
  }

  // ========================================
  // ENVIAR CORREO CON PDF
  // ========================================
  async enviarCorreoConPDF(reclamo: LibroReclamacion, pdfBuffer: Buffer): Promise<void> {
    await this.mailService.enviarCorreoRegistroReclamo(reclamo, pdfBuffer);
  }

  // ========================================
  // GENERAR CÓDIGO ÚNICO
  // ========================================
  private async generarCodigoReclamo(): Promise<string> {
    const año = new Date().getFullYear();
    const mes = String(new Date().getMonth() + 1).padStart(2, '0');
    const dia = String(new Date().getDate()).padStart(2, '0');

    // Contar reclamos del día
    const inicioDelDia = new Date();
    inicioDelDia.setHours(0, 0, 0, 0);

    const finDelDia = new Date();
    finDelDia.setHours(23, 59, 59, 999);

    const reclamosHoy = await this.reclamoRepo
      .createQueryBuilder('reclamo')
      .where('reclamo.fecha_registro >= :inicio', { inicio: inicioDelDia })
      .andWhere('reclamo.fecha_registro <= :fin', { fin: finDelDia })
      .getCount();

    const numero = String(reclamosHoy + 1).padStart(4, '0');

    return `RC-${año}${mes}${dia}-${numero}`;
  }

  // ========================================
  // LISTAR RECLAMOS (ADMIN)
  // ========================================
  async listarReclamos(filtros: FiltrarReclamosDto) {
    const { page = 1, limit = 10, estado_id, tipo_solicitud_id, fecha_desde, fecha_hasta, busqueda } = filtros;

    const query = this.reclamoRepo
      .createQueryBuilder('reclamo')
      .leftJoinAndSelect('reclamo.estado', 'estado')
      .leftJoinAndSelect('reclamo.tipoSolicitud', 'tipoSolicitud')
      .leftJoinAndSelect('reclamo.tipoBien', 'tipoBien')
      .orderBy('reclamo.fecha_registro', 'DESC');

    // Filtros
    if (estado_id) {
      query.andWhere('reclamo.estado_id = :estado_id', { estado_id });
    }

    if (tipo_solicitud_id) {
      query.andWhere('reclamo.tipo_solicitud_id = :tipo_solicitud_id', { tipo_solicitud_id });
    }

    if (fecha_desde) {
      query.andWhere('reclamo.fecha_registro >= :fecha_desde', { fecha_desde });
    }

    if (fecha_hasta) {
      query.andWhere('reclamo.fecha_registro <= :fecha_hasta', { fecha_hasta });
    }

    if (busqueda) {
      query.andWhere(
        '(reclamo.nombres LIKE :busqueda OR reclamo.apellidos LIKE :busqueda OR reclamo.numero_documento LIKE :busqueda OR reclamo.codigo_reclamo LIKE :busqueda)',
        { busqueda: `%${busqueda}%` },
      );
    }

    // Paginación
    const [reclamos, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: reclamos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ========================================
  // OBTENER RECLAMO POR ID (ADMIN)
  // ========================================
  async obtenerReclamoPorId(id: number): Promise<LibroReclamacion> {
    const reclamo = await this.reclamoRepo.findOne({
      where: { id },
      relations: ['estado', 'tipoSolicitud', 'tipoBien', 'documentos', 'seguimientos', 'seguimientos.estado', 'seguimientos.usuario'],
    });

    if (!reclamo) {
      throw new NotFoundException('Reclamo no encontrado');
    }

    // Normalizar las rutas de los archivos para que solo devuelvan el nombre del archivo
    if (reclamo.documentos && reclamo.documentos.length > 0) {
      reclamo.documentos = reclamo.documentos.map(doc => {
        // Extraer solo el nombre del archivo de la ruta completa
        // Ej: "reclamos/archivo.pdf" -> "archivo.pdf" o "uploads/reclamos/archivo.pdf" -> "archivo.pdf"
        if (doc.ruta_archivo) {
          // Normalizar barras invertidas a barras normales
          let rutaNormalizada = doc.ruta_archivo.replace(/\\/g, '/');

          // Extraer solo el nombre del archivo (lo que viene después de la última barra)
          const partes = rutaNormalizada.split('/');
          doc.ruta_archivo = partes[partes.length - 1];
        }
        return doc;
      });
    }

    return reclamo;
  }

  // ========================================
  // CONSULTAR POR CÓDIGO (PÚBLICO)
  // ========================================
  async consultarPorCodigo(codigo: string, numeroDocumento: string): Promise<LibroReclamacion> {
    const reclamo = await this.reclamoRepo.findOne({
      where: {
        codigo_reclamo: codigo,
        numero_documento: numeroDocumento,
      },
      relations: ['estado', 'tipoSolicitud', 'tipoBien'],
      // NO incluir 'documentos' por seguridad - la información detallada solo en panel admin
    });

    if (!reclamo) {
      throw new NotFoundException('Reclamo no encontrado o documento no coincide');
    }

    // Devolver todos los datos para permitir generar el PDF completo
    // Los documentos adjuntos NO se incluyen por seguridad
    return reclamo;
  }

  // ========================================
  // RESPONDER RECLAMO (ADMIN)
  // ========================================
  async responderReclamo(id: number, dto: ResponderReclamoDto, ipRespuesta?: string): Promise<LibroReclamacion> {
    console.log('📝 ========== RESPONDER RECLAMO ==========');
    console.log('📝 ID:', id);

    // Buscar estado "Respondido"
    const estadoRespondido = await this.estadoRepo.findOne({
      where: { nombre: 'Respondido' },
    });

    console.log('📝 Estado "Respondido":', estadoRespondido);

    if (!estadoRespondido) {
      throw new Error('No se encontró el estado "Respondido"');
    }

    // Actualizar DIRECTAMENTE en la BD con UPDATE (más confiable)
    console.log('📝 Ejecutando UPDATE con estado_id:', estadoRespondido.id);
    await this.reclamoRepo.update(id, {
      respuesta_proveedor: dto.respuesta_proveedor,
      fecha_respuesta: new Date(),
      ip_respuesta: ipRespuesta,
      usuario_respuesta_id: dto.usuario_id,
      estado_id: estadoRespondido.id, // ✅ Cambio automático a "Respondido"
    });

    console.log('📝 ✅ UPDATE ejecutado correctamente');

    // Registrar en seguimiento
    await this.registrarSeguimiento(
      id,
      estadoRespondido.id,
      'Reclamo respondido por el proveedor',
      dto.usuario_id,
    );

    console.log('📝 ✅ Seguimiento registrado');

    // Obtener reclamo con todas las relaciones para el correo
    const reclamoCompleto = await this.obtenerReclamoPorId(id);

    // Enviar correo al consumidor notificando la respuesta
    if (reclamoCompleto.email) {
      this.mailService.enviarCorreoCambioEstado(reclamoCompleto, 'En proceso').catch(err => {
        console.error('Error al enviar correo de respuesta:', err);
      });
    }

    return reclamoCompleto;
  }

  // ========================================
  // CAMBIAR ESTADO (ADMIN)
  // ========================================
  async cambiarEstado(id: number, dto: CambiarEstadoDto): Promise<LibroReclamacion> {
    console.log('🔄 Cambiando estado del reclamo', id);
    console.log('📝 DTO recibido:', dto);

    // Obtener el reclamo con estado actual para enviar correo
    const reclamoAntes = await this.reclamoRepo.findOne({
      where: { id },
      relations: ['estado'],
    });

    if (!reclamoAntes) {
      throw new NotFoundException('Reclamo no encontrado');
    }

    console.log('📋 Reclamo encontrado:', { id: reclamoAntes.id, estado_actual: reclamoAntes.estado_id });

    const estadoAnteriorNombre = reclamoAntes.estado?.nombre || 'Desconocido';
    const estadoAnteriorId = reclamoAntes.estado_id;

    // Actualizar directamente en la base de datos usando update
    console.log('💾 Actualizando estado en la BD:', dto.estado_id);
    const updateResult = await this.reclamoRepo.update(
      { id },
      { estado_id: dto.estado_id }
    );

    console.log('📊 Resultado del UPDATE:', updateResult);

    // Registrar en seguimiento
    console.log('📌 Registrando en seguimiento...');
    await this.registrarSeguimiento(
      id,
      dto.estado_id,
      dto.descripcion || 'Cambio de estado',
      dto.usuario_id,
    );

    console.log('✅ Estado cambiado exitosamente de', estadoAnteriorId, 'a', dto.estado_id);

    // Obtener reclamo actualizado con todas las relaciones
    const reclamoActualizado = await this.obtenerReclamoPorId(id);

    // Enviar correo de notificación de cambio de estado
    if (reclamoActualizado.email) {
      this.mailService.enviarCorreoCambioEstado(reclamoActualizado, estadoAnteriorNombre).catch(err => {
        console.error('Error al enviar correo de cambio de estado:', err);
      });
    }

    return reclamoActualizado;
  }

  // ========================================
  // REGISTRAR SEGUIMIENTO
  // ========================================
  private async registrarSeguimiento(
    reclamoId: number,
    estadoId: number,
    descripcion: string,
    usuarioId: number | null,
  ): Promise<void> {
    const seguimiento = this.seguimientoRepo.create({
      reclamo_id: reclamoId,
      estado_id: estadoId,
      descripcion,
      usuario_id: usuarioId,
      fecha: new Date(),
    });

    await this.seguimientoRepo.save(seguimiento);
  }

  // ========================================
  // GUARDAR DOCUMENTO
  // ========================================
  async guardarDocumento(
    reclamoId: number,
    nombreOriginal: string,
    rutaArchivo: string,
    mime: string,
    tamaño: number,
  ): Promise<LibroReclamacionesDocumento> {
    const documento = this.documentoRepo.create({
      reclamo_id: reclamoId,
      nombre_original: nombreOriginal,
      ruta_archivo: rutaArchivo,
      mime,
      tamaño,
    });

    return await this.documentoRepo.save(documento);
  }

  // ========================================
  // CATÁLOGOS
  // ========================================
  async obtenerEstados(): Promise<LibroReclamacionesEstado[]> {
    return await this.estadoRepo.find();
  }

  async obtenerTiposSolicitud(): Promise<LibroReclamacionesTipoSolicitud[]> {
    return await this.tipoSolicitudRepo.find();
  }

  async obtenerTiposBien(): Promise<LibroReclamacionesTipoBien[]> {
    return await this.tipoBienRepo.find();
  }

  // ========================================
  // ESTADÍSTICAS (ADMIN)
  // ========================================
  async obtenerEstadisticas() {
    const total = await this.reclamoRepo.count();

    const porEstado = await this.reclamoRepo
      .createQueryBuilder('reclamo')
      .select('estado.nombre', 'estado')
      .addSelect('COUNT(reclamo.id)', 'cantidad')
      .leftJoin('reclamo.estado', 'estado')
      .groupBy('estado.id')
      .getRawMany();

    const porTipo = await this.reclamoRepo
      .createQueryBuilder('reclamo')
      .select('tipo.nombre', 'tipo')
      .addSelect('COUNT(reclamo.id)', 'cantidad')
      .leftJoin('reclamo.tipoSolicitud', 'tipo')
      .groupBy('tipo.id')
      .getRawMany();

    const ultimosReclamos = await this.reclamoRepo.find({
      take: 5,
      order: { fecha_registro: 'DESC' },
      relations: ['estado', 'tipoSolicitud'],
    });

    return {
      total,
      porEstado,
      porTipo,
      ultimosReclamos,
    };
  }
}
