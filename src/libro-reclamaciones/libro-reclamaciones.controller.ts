import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { LibroReclamacionesService } from './libro-reclamaciones.service';
import { CrearReclamoDto } from './dto/crear-reclamo.dto';
import { ResponderReclamoDto } from './dto/responder-reclamo.dto';
import { CambiarEstadoDto } from './dto/cambiar-estado.dto';
import { FiltrarReclamosDto } from './dto/filtrar-reclamos.dto';

@Controller('backend_api/libro-reclamaciones')
export class LibroReclamacionesController {
  constructor(private readonly service: LibroReclamacionesService) {}

  // ========================================
  // RUTAS PÚBLICAS (sin autenticación)
  // ========================================

  /**
   * CREAR RECLAMO (PÚBLICO)
   * Permite a cualquier persona registrar un reclamo
   */
  @Public()
  @Post('publico/crear')
  @UseInterceptors(
    FilesInterceptor('archivos', 5, {
      storage: diskStorage({
        destination: './uploads/reclamos',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `reclamo-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Tipo de archivo no permitido'), false);
        }
      },
    }),
  )
  async crearReclamoPublico(
    @Body() dto: CrearReclamoDto,
    @UploadedFiles() archivos?: Express.Multer.File[],
    @Req() req?: any,
  ) {
    // Obtener IP real del cliente desde el request
    const ipRegistro = req.ip ||
                       req.headers['x-forwarded-for']?.split(',')[0] ||
                       req.headers['x-real-ip'] ||
                       req.connection?.remoteAddress ||
                       req.socket?.remoteAddress ||
                       'IP no disponible';

    // Obtener User Agent
    const userAgent = req.headers['user-agent'] || 'User Agent no disponible';

    console.log('📍 IP capturada del cliente:', ipRegistro);
    console.log('🖥️ User Agent:', userAgent);

    const reclamo = await this.service.crearReclamo(dto, ipRegistro, userAgent);

    // Guardar archivos adjuntos si existen
    if (archivos && archivos.length > 0) {
      for (const archivo of archivos) {
        // Remover el prefijo "uploads/" del path para que sea consistente con la configuración de archivos estáticos
        // Normalizar las barras invertidas a barras normales para compatibilidad con URLs
        let rutaRelativa = archivo.path.replace(/^uploads[\\/]/, '').replace(/\\/g, '/');

        console.log('📁 Ruta original del archivo:', archivo.path);
        console.log('📁 Ruta normalizada:', rutaRelativa);

        await this.service.guardarDocumento(
          reclamo.id,
          archivo.originalname,
          rutaRelativa,
          archivo.mimetype,
          archivo.size,
        );
      }
    }

    return {
      success: true,
      message: 'Reclamo registrado exitosamente',
      data: reclamo,
    };
  }

  /**
   * CONSULTAR RECLAMO (PÚBLICO)
   * Permite consultar un reclamo con código y documento
   */
  @Public()
  @Get('publico/consultar')
  async consultarReclamoPublico(
    @Query('codigo') codigo: string,
    @Query('documento') documento: string,
  ) {
    const reclamo = await this.service.consultarPorCodigo(codigo, documento);
    return {
      success: true,
      data: reclamo,
    };
  }

  /**
   * OBTENER DATOS PARA PDF (PÚBLICO)
   * Devuelve todos los datos necesarios para generar el PDF.
   * Requiere código de reclamo + número de documento como verificación.
   * NO requiere autenticación — es para el consumidor.
   */
  @Public()
  @Get('publico/pdf')
  async obtenerDatosParaPDF(
    @Query('codigo') codigo: string,
    @Query('documento') documento: string,
  ) {
    const reclamo = await this.service.consultarPorCodigo(codigo, documento);
    return {
      success: true,
      data: reclamo,
    };
  }

  /**
   * OBTENER CATÁLOGOS (PÚBLICO)
   * Para llenar los selects del formulario
   */
  @Public()
  @Get('publico/catalogos')
  async obtenerCatalogos() {
    const [estados, tiposSolicitud, tiposBien] = await Promise.all([
      this.service.obtenerEstados(),
      this.service.obtenerTiposSolicitud(),
      this.service.obtenerTiposBien(),
    ]);

    return {
      success: true,
      data: {
        estados,
        tiposSolicitud,
        tiposBien,
      },
    };
  }

  /**
   * SERVIR ARCHIVOS DE RECLAMOS (PROTEGIDO - SOLO ADMINISTRADORES)
   * Endpoint para servir documentos adjuntos a reclamos con autenticación
   */
  @Get('admin/archivo/:filename')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Administrador')
  async getArchivo(@Param('filename') filename: string, @Res() res: Response) {
    // La ruta completa del archivo en el servidor
    const rutaArchivo = path.join(process.cwd(), 'uploads', 'reclamos', filename);

    console.log('📂 Buscando archivo en:', rutaArchivo);

    if (!fs.existsSync(rutaArchivo)) {
      console.error('❌ Archivo no encontrado:', rutaArchivo);
      throw new BadRequestException('Archivo no encontrado');
    }

    const ext = extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    const fileStream = fs.createReadStream(rutaArchivo);
    fileStream.pipe(res);
  }

  /**
   * ENVIAR CORREO CON PDF (PÚBLICO)
   * El frontend genera el PDF y lo envía para adjuntar al correo
   */
  @Public()
  @Post('publico/enviar-correo-pdf')
  @UseInterceptors(
    FilesInterceptor('pdf', 1, {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new Error('Solo se permiten archivos PDF'), false);
        }
      },
    }),
  )
  async enviarCorreoConPDF(
    @Body() body: { codigo_reclamo: string; documento: string },
    @UploadedFiles() archivos?: Express.Multer.File[],
  ) {
    const { codigo_reclamo, documento } = body;

    // Obtener el reclamo
    const reclamo = await this.service.consultarPorCodigo(codigo_reclamo, documento);

    if (!reclamo) {
      return {
        success: false,
        message: 'Reclamo no encontrado',
      };
    }

    // Obtener el PDF del archivo subido
    const pdfBuffer = archivos && archivos.length > 0 ? archivos[0].buffer : null;

    // Enviar correo con el PDF adjunto
    if (reclamo.email) {
      await this.service.enviarCorreoConPDF(reclamo, pdfBuffer);
    }

    return {
      success: true,
      message: 'Correo enviado exitosamente',
    };
  }

  // ========================================
  // RUTAS ADMINISTRATIVAS (con autenticación)
  // ========================================

  /**
   * LISTAR RECLAMOS (ADMIN)
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Administrador')
  async listarReclamos(@Query() filtros: FiltrarReclamosDto) {
    const result = await this.service.listarReclamos(filtros);
    return {
      success: true,
      ...result,
    };
  }

  /**
   * OBTENER RECLAMO POR ID (ADMIN)
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Administrador')
  async obtenerReclamo(@Param('id', ParseIntPipe) id: number) {
    const reclamo = await this.service.obtenerReclamoPorId(id);
    return {
      success: true,
      data: reclamo,
    };
  }

  /**
   * RESPONDER RECLAMO (ADMIN)
   */
  @Put(':id/responder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Administrador')
  async responderReclamo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResponderReclamoDto,
    @Req() req?: any,
  ) {
    // Extraer IP del administrador que responde
    const ipRespuesta = req?.ip || req?.connection?.remoteAddress || req?.headers['x-forwarded-for'];

    const reclamo = await this.service.responderReclamo(id, dto, ipRespuesta);
    return {
      success: true,
      message: 'Respuesta registrada exitosamente',
      data: reclamo,
    };
  }

  /**
   * CAMBIAR ESTADO (ADMIN)
   */
  @Put(':id/estado')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Administrador')
  async cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoDto,
  ) {
    console.log('🎯 Controller: Cambiar Estado - ID:', id);
    console.log('📦 Controller: Body recibido:', dto);
    console.log('📦 Controller: Tipo de estado_id:', typeof dto.estado_id);
    console.log('📦 Controller: Tipo de usuario_id:', typeof dto.usuario_id);

    const reclamo = await this.service.cambiarEstado(id, dto);
    return {
      success: true,
      message: 'Estado actualizado exitosamente',
      data: reclamo,
    };
  }

  /**
   * ESTADÍSTICAS (ADMIN)
   */
  @Get('admin/estadisticas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Administrador')
  async obtenerEstadisticas() {
    const stats = await this.service.obtenerEstadisticas();
    return {
      success: true,
      data: stats,
    };
  }
}