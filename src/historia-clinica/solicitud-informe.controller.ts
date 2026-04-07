import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Request,
  ForbiddenException,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';

import {
  SolicitudInformeService,
  VistaRol,
} from './solicitud-informe.service';

import {
  CreateSolicitudInformeDto,
  UpdateSolicitudInformeDto,
  SubirArchivoDto,
  RevisarInformeDto,
  MarcarEntregadoDto,
} from './dto/create-solicitud-informe.dto';

import { Public } from '../auth/decorators/public.decorator';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES DE ROLES
// ─────────────────────────────────────────────────────────────────────────────
const ROL_ADMIN     = 1;
const ROL_ADMISION  = 2;
const ROL_TERAPEUTA = 4;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function vistaDesdeRol(rolId: number, esJefe: boolean): VistaRol {
  if (rolId === ROL_ADMIN)     return 'admin';
  if (rolId === ROL_ADMISION)  return 'admision';
  if (rolId === ROL_TERAPEUTA) return esJefe ? 'jefa' : 'terapeuta';
  return 'terapeuta'; // fallback seguro
}

@Controller('backend_api/solicitudes-informe')
@UseGuards(JwtAuthGuard)
export class SolicitudInformeController {
  constructor(private readonly service: SolicitudInformeService) {}

  // ══════════════════════════════════════════════════════════════════════════
  // CRUD BASE
  // ══════════════════════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════════════════════
  // CATÁLOGOS (deben ir PRIMERO para evitar conflictos con :id)
  // ══════════════════════════════════════════════════════════════════════════

  @Get('catalogos/modalidades-pago')
  findModalidadesPago() {
    return this.service.findAllModalidadesPago();
  }

  @Get('catalogos/estados-pago')
  findEstadosPago() {
    return this.service.findAllEstadosPago();
  }

  @Get('catalogos/estados-solicitud')
  findEstadosSolicitud() {
    return this.service.findAllEstadosSolicitud();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SERVIR ARCHIVOS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * GET /solicitudes-informe/archivo/:filename
   * Sirve los archivos de informes (PDFs y Word) almacenados en el servidor
   * PÚBLICO (sin guard) para permitir previsualización y descarga
   */
  @Public()
  @Get('archivo/:filename')
  async verArchivo(@Param('filename') filename: string, @Res() res: Response) {
    const rutaArchivo = path.join(process.cwd(), 'uploads', 'solicitudes_informe', filename);

    if (!fs.existsSync(rutaArchivo)) {
      throw new BadRequestException('Archivo no encontrado');
    }

    const ext = extname(filename).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    const fileStream = fs.createReadStream(rutaArchivo);
    fileStream.pipe(res);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CRUD BASE (rutas específicas ANTES de :id)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * POST /solicitudes-informe
   * Solo Admin (1) y Admisión (2) pueden crear.
   */
  @Post()
  create(@Body() dto: CreateSolicitudInformeDto, @Request() req) {
    const rolId = req.user?.rol?.id;
    if (rolId !== ROL_ADMIN && rolId !== ROL_ADMISION) {
      throw new ForbiddenException(
        'Solo Administración o Admisión pueden crear solicitudes de informe.',
      );
    }
    return this.service.create(dto, rolId);
  }

  /**
   * GET /solicitudes-informe
   * - Admin y Admisión ven todo
   * - Terapeuta (no jefa) solo ve sus solicitudes
   * - Terapeuta jefa ve las de sus subordinadas y las suyas
   */
  @Get()
  findAll(@Request() req) {
    const rolId = req.user?.rol?.id;
    const userId = req.user?.id;
    const esJefe = Boolean(req.user?.cargo?.es_jefe);

    // Admin y Admisión ven todo
    if (rolId === ROL_ADMIN || rolId === ROL_ADMISION) {
      return this.service.findAll();
    }

    // Terapeuta ve solo las suyas (o de subordinadas si es jefa)
    if (rolId === ROL_TERAPEUTA) {
      return this.service.findAllByTerapeuta(userId, esJefe);
    }

    throw new ForbiddenException('No tienes permiso para ver este listado.');
  }

  /**
   * GET /solicitudes-informe/paciente/:pacienteId
   * - Admin/Admisión: ven todas las solicitudes del paciente
   * - Terapeuta (no jefa): solo ve sus propias solicitudes del paciente
   * - Terapeuta jefa: ve las suyas y las de sus subordinadas del paciente
   */
  @Get('paciente/:pacienteId')
  findByPaciente(
    @Param('pacienteId', ParseIntPipe) pacienteId: number,
    @Request() req,
  ) {
    const rolId = req.user?.rol?.id;
    const userId = req.user?.id;
    const esJefe = Boolean(req.user?.cargo?.es_jefe);
    const vista = vistaDesdeRol(rolId, esJefe);
    return this.service.findByPaciente(pacienteId, vista, userId, esJefe);
  }

  /**
   * GET /solicitudes-informe/especialista/:especialistaId
   * La terapeuta ve sus propias solicitudes (sin datos financieros).
   * Admin y Admisión también pueden consultar por especialista.
   */
  @Get('especialista/:especialistaId')
  findByEspecialista(
    @Param('especialistaId', ParseIntPipe) especialistaId: number,
    @Request() req,
  ) {
    const rolId = req.user?.rol?.id;
    const userId = req.user?.id;

    // Una terapeuta solo puede ver sus propias solicitudes
    if (rolId === ROL_TERAPEUTA && userId !== especialistaId) {
      throw new ForbiddenException('Solo puedes ver tus propias solicitudes.');
    }

    return this.service.findByEspecialista(especialistaId);
  }

  /**
   * GET /solicitudes-informe/:id
   * Todos pueden consultar una solicitud, pero la vista varía según el rol.
   * IMPORTANTE: Esta ruta genérica DEBE ir AL FINAL para no capturar rutas específicas
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const rolId = req.user?.rol?.id;
    const esJefe = Boolean(req.user?.cargo?.es_jefe);
    const vista = vistaDesdeRol(rolId, esJefe);
    return this.service.findOneByRol(id, vista);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WORKFLOW (rutas específicas con sufijos)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * POST /solicitudes-informe/:id/subir-archivo
   * Solo terapeutas (ROL 4) pueden subir el archivo.
   * Devuelve la solicitud SIN datos financieros.
   */
  @Post(':id/subir-archivo')
  @UseInterceptors(FileInterceptor('archivo', {
    storage: undefined,
    fileFilter: (req, file, callback) => {
      const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];

      if (allowedMimeTypes.includes(file.mimetype)) {
        callback(null, true);
      } else {
        callback(new HttpException(
          `Solo se permiten archivos PDF o Word. Formato recibido: ${file.mimetype}`,
          HttpStatus.BAD_REQUEST
        ), false);
      }
    },
    limits: {
      fileSize: 20 * 1024 * 1024, // 20 MB
    },
  }))
  async subirArchivo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 DEBUG - Endpoint subir-archivo llamado');
    console.log('📋 ID solicitud:', id);
    console.log('👤 Usuario:', req.user?.id, req.user?.nombres);
    console.log('🎭 Rol:', req.user?.rol?.id);
    console.log('📎 Archivo recibido:', file);
    console.log('📦 Body completo:', req.body);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const rolId = req.user?.rol?.id;
    if (rolId !== ROL_TERAPEUTA) {
      throw new ForbiddenException('Solo el terapeuta asignado puede subir el archivo.');
    }

    if (!file) {
      console.error('❌ ERROR: No se recibió archivo');
      console.error('Headers:', req.headers);
      throw new HttpException('Archivo requerido', HttpStatus.BAD_REQUEST);
    }

    // Guardar el archivo en el sistema de archivos
    const extension = path.extname(file.originalname);
    const nombreArchivo = `${uuidv4()}_informe${extension}`;
    const subcarpeta = 'solicitudes_informe';
    const rutaArchivo = `${subcarpeta}/${nombreArchivo}`;

    const uploadsDir = path.join(process.cwd(), 'uploads');
    const subcarpetaCompleta = path.join(uploadsDir, subcarpeta);

    if (!fs.existsSync(subcarpetaCompleta)) {
      fs.mkdirSync(subcarpetaCompleta, { recursive: true });
    }

    const rutaCompleta = path.join(uploadsDir, rutaArchivo);

    try {
      fs.writeFileSync(rutaCompleta, file.buffer);
      console.log('💾 Archivo de informe guardado:', rutaCompleta);
    } catch (error) {
      throw new HttpException(
        `Error al guardar el archivo: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    // Crear el DTO con la URL del archivo y el usuario que actúa
    const dto: SubirArchivoDto = {
      archivo_url: `/uploads/${rutaArchivo}`,
      user_actua_id: req.user?.id,
    };

    return this.service.subirArchivo(id, dto);
  }

  /**
   * PATCH /solicitudes-informe/:id/revisar
   * Solo la jefa (ROL_TERAPEUTA con es_jefe = true) puede revisar.
   * Devuelve la solicitud SIN datos financieros.
   */
  @Patch(':id/revisar')
  revisarInforme(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RevisarInformeDto,
    @Request() req,
  ) {
    const rolId = req.user?.rol?.id;
    const esJefe = Boolean(req.user?.cargo?.es_jefe);

    // Admins también pueden revisar si lo necesitas; ajusta aquí
    if (rolId !== ROL_TERAPEUTA && rolId !== ROL_ADMIN) {
      throw new ForbiddenException('No tienes permiso para revisar informes.');
    }
    if (rolId === ROL_TERAPEUTA && !esJefe) {
      throw new ForbiddenException(
        'Solo la jefa / supervisora puede aprobar o rechazar informes.',
      );
    }

    return this.service.revisarInforme(id, dto, esJefe || rolId === ROL_ADMIN);
  }

  /**
   * PATCH /solicitudes-informe/:id/entregar
   * Solo Admin (1) y Admisión (2) marcan la entrega.
   */
  @Patch(':id/entregar')
  marcarEntregado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarcarEntregadoDto,
    @Request() req,
  ) {
    const rolId = req.user?.rol?.id;
    if (rolId !== ROL_ADMIN && rolId !== ROL_ADMISION) {
      throw new ForbiddenException(
        'Solo Administración o Admisión pueden marcar un informe como entregado.',
      );
    }
    return this.service.marcarEntregado(id, dto);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HISTORIAL DE REVISIONES
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * GET /solicitudes-informe/:id/revisiones
   * Admin, jefa y el terapeuta asignado pueden ver el historial.
   */
  @Get(':id/revisiones')
  findRevisiones(@Param('id', ParseIntPipe) id: number) {
    return this.service.findRevisiones(id);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // OPERACIONES CON :id (deben ir AL FINAL)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * PATCH /solicitudes-informe/:id
   * Solo Admin y Admisión pueden editar datos generales.
   */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSolicitudInformeDto,
    @Request() req,
  ) {
    const rolId = req.user?.rol?.id;
    if (rolId !== ROL_ADMIN && rolId !== ROL_ADMISION) {
      throw new ForbiddenException('No tienes permiso para editar esta solicitud.');
    }
    return this.service.update(id, dto);
  }

  /**
   * DELETE /solicitudes-informe/:id
   * Solo Admin puede eliminar.
   */
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const rolId = req.user?.rol?.id;
    if (rolId !== ROL_ADMIN) {
      throw new ForbiddenException('Solo el Administrador puede eliminar solicitudes.');
    }
    return this.service.remove(id);
  }
}