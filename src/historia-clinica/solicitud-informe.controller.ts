import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SolicitudInformeService } from './solicitud-informe.service';

import {
  CreateSolicitudInformeDto,
  UpdateSolicitudInformeDto,
  SubirArchivoDto,
  RevisarInformeDto,
  MarcarEntregadoDto,
} from './dto/solicitud-informe.dto';

// ─── Helper: configuración de Multer para subida de archivos ──────────────────
const multerOptions = {
  storage: diskStorage({
    destination: join(process.cwd(), 'uploads', 'informes'),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `informe-${unique}${extname(file.originalname)}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    if (allowed.includes(extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos PDF o Word (.doc/.docx)'), false);
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
};

@ApiTags('Solicitud de Informe')
@Controller('backend_api/solicitud-informe')
@UseGuards(JwtAuthGuard)
export class SolicitudInformeController {
  constructor(private readonly service: SolicitudInformeService) {}

  // ════════════════════════════════════════════════════════════════
  // CATÁLOGOS (deben ir ANTES de las rutas con parámetro :id)
  // ════════════════════════════════════════════════════════════════

  @Get('catalogos/modalidades-pago')
  @ApiOperation({ summary: 'Obtener todas las modalidades de pago' })
  findAllModalidadesPago() {
    return this.service.findAllModalidadesPago();
  }

  @Get('catalogos/estados-pago')
  @ApiOperation({ summary: 'Obtener todos los estados de pago' })
  findAllEstadosPago() {
    return this.service.findAllEstadosPago();
  }

  @Get('catalogos/estados-solicitud')
  @ApiOperation({ summary: 'Obtener todos los estados del workflow de solicitud de informe' })
  findAllEstadosSolicitud() {
    return this.service.findAllEstadosSolicitud();
  }

  // ════════════════════════════════════════════════════════════════
  // CRUD BASE
  // ════════════════════════════════════════════════════════════════

  @Post()
  @ApiOperation({ summary: 'Crear solicitud de informe (Admisión)' })
  @ApiResponse({ status: 201, description: 'Solicitud creada – notifica a la terapeuta' })
  async create(@Body() dto: CreateSolicitudInformeDto, @Request() req) {
    dto.user_crea_id = req.user?.id;
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las solicitudes de informe' })
  findAll() {
    return this.service.findAll();
  }

  @Get('paciente/:pacienteId')
  @ApiOperation({ summary: 'Solicitudes de informe de un paciente' })
  @ApiParam({ name: 'pacienteId', description: 'ID del paciente' })
  findByPaciente(@Param('pacienteId', ParseIntPipe) pacienteId: number) {
    return this.service.findByPaciente(pacienteId);
  }

  @Get('especialista/:especialistaId')
  @ApiOperation({ summary: 'Solicitudes asignadas a una terapeuta' })
  @ApiParam({ name: 'especialistaId', description: 'ID del especialista/terapeuta' })
  findByEspecialista(@Param('especialistaId', ParseIntPipe) especialistaId: number) {
    return this.service.findByEspecialista(especialistaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una solicitud por ID' })
  @ApiParam({ name: 'id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar datos generales de una solicitud' })
  @ApiParam({ name: 'id' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSolicitudInformeDto,
    @Request() req,
  ) {
    dto.user_actua_id = req.user?.id;
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una solicitud de informe' })
  @ApiParam({ name: 'id' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.service.remove(id);
    return { message: 'Solicitud eliminada exitosamente' };
  }

  // ════════════════════════════════════════════════════════════════
  // WORKFLOW – PASO 1: TERAPEUTA SUBE EL ARCHIVO
  // ════════════════════════════════════════════════════════════════

  /**
   * POST /backend_api/solicitud-informe/:id/subir-archivo
   * Body: multipart/form-data con campo "archivo"
   *
   * La terapeuta sube el PDF/Word del informe.
   * Estado: Pendiente Subida → Pendiente Revisión
   * Notifica a la jefa.
   */
  @Post(':id/subir-archivo')
  @ApiOperation({ summary: 'Terapeuta sube el archivo del informe' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { archivo: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('archivo', multerOptions))
  async subirArchivo(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) throw new Error('Debes adjuntar un archivo.');

    // Construir la URL pública relativa al servidor
    const archivo_url = `/uploads/informes/${file.filename}`;

    const dto: SubirArchivoDto = {
      archivo_url,
      user_actua_id: req.user?.id,
    };

    return this.service.subirArchivo(id, dto);
  }

  // ════════════════════════════════════════════════════════════════
  // WORKFLOW – PASO 2: JEFA REVISA (APRUEBA / RECHAZA)
  // ════════════════════════════════════════════════════════════════

  /**
   * POST /backend_api/solicitud-informe/:id/revisar
   * Body: { estado_id: 3|4, comentario?: string }
   *
   * Estado: Pendiente Revisión → Rechazado | Aprobado
   * Si rechaza: notifica a la terapeuta con el comentario.
   * Si aprueba: notifica a admisión.
   */
  @Post(':id/revisar')
  @ApiOperation({ summary: 'Jefa aprueba o rechaza el informe' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: '3 = Rechazado (notifica terapeuta) | 4 = Aprobado (notifica admisión)' })
  async revisarInforme(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RevisarInformeDto,
    @Request() req,
  ) {
    dto.revisor_id = req.user?.id;
    return this.service.revisarInforme(id, dto);
  }

  // ════════════════════════════════════════════════════════════════
  // WORKFLOW – PASO 3: ADMISIÓN MARCA COMO ENTREGADO
  // ════════════════════════════════════════════════════════════════

  /**
   * POST /backend_api/solicitud-informe/:id/marcar-entregado
   *
   * Estado: Aprobado → Entregado
   */
  @Post(':id/marcar-entregado')
  @ApiOperation({ summary: 'Admisión marca el informe como entregado al paciente' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  async marcarEntregado(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    const dto: MarcarEntregadoDto = { user_actua_id: req.user?.id };
    return this.service.marcarEntregado(id, dto);
  }

  // ════════════════════════════════════════════════════════════════
  // HISTORIAL DE REVISIONES
  // ════════════════════════════════════════════════════════════════

  /**
   * GET /backend_api/solicitud-informe/:id/revisiones
   *
   * Devuelve todas las revisiones (aprobaciones/rechazos) de una solicitud.
   */
  @Get(':id/revisiones')
  @ApiOperation({ summary: 'Historial de revisiones de una solicitud' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  findRevisiones(@Param('id', ParseIntPipe) id: number) {
    return this.service.findRevisiones(id);
  }
}