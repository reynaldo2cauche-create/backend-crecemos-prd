import { 
  Controller, Get, Post, Body, Patch, Param, Put, 
  UseGuards, Request, Delete, Query, BadRequestException, 
  Res, UseInterceptors, UploadedFile 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TrabajadorCentroService } from './trabajador-centro.service';
import { CreateTrabajadorCentroDto } from './dto/create-trabajador-centro.dto';
import { UpdateTrabajadorCentroDto } from './dto/update-trabajador-centro.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

@Controller('backend_api/trabajadores')
export class TrabajadorCentroController {
  constructor(private readonly service: TrabajadorCentroService) {}

  // ============== ENDPOINTS ORIGINALES ==============
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('select')
  findAllForSelect() {
    return this.service.findAllForSelect();
  }

  @Get('terapeutas')
  findTerapeutas() {
    return this.service.findTerapeutas();
  }

  // ============== ENDPOINTS RRHH ==============
  @Get('empleados')
  @UseGuards(JwtAuthGuard)
  findAllEmpleados(@Query('estado') estado?: string) {
    return this.service.findAllForRRHH(estado);
  }

  @Get('empleados/:id')
  @UseGuards(JwtAuthGuard)
  findOneEmpleado(@Param('id') id: string) {
    return this.service.findOneById(+id);
  }

  @Post('empleados')
  @UseGuards(JwtAuthGuard)
  createEmpleado(@Body() dto: CreateTrabajadorCentroDto) {
    return this.service.create(dto);
  }

  @Put('empleados/:id')
  @UseGuards(JwtAuthGuard)
  updateEmpleado(@Param('id') id: string, @Body() dto: UpdateTrabajadorCentroDto) {
    return this.service.update(+id, dto);
  }

  @Delete('empleados/:id')
  @UseGuards(JwtAuthGuard)
  deleteEmpleado(@Param('id') id: string) {
    return this.service.remove(+id);
  }

  // ============== ENDPOINTS DE PERFIL ==============
  @Get('perfil/me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Request() req) {
    console.log('🔍 req.user:', req.user);
    console.log('🆔 User ID:', req.user.id);
    return this.service.findOneById(req.user.id);
  }

  @Patch('perfil/me')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(@Request() req, @Body() dto: UpdateTrabajadorCentroDto) {
    console.log('🔍 Actualizando perfil de usuario ID:', req.user.id);
    return this.service.update(req.user.id, dto);
  }

  @Get('perfil/me/campos-bloqueados')
  @UseGuards(JwtAuthGuard)
  async getMisCamposBloqueados(@Request() req) {
    return this.service.getCamposBloqueados(req.user.id);
  }

  // ============== ENDPOINTS DE ARCHIVOS ==============
  
  // Subir CV
  @Post(':id/cv')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('cv'))
  async subirCV(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    if (!file) {
      throw new BadRequestException('No se ha enviado ningún archivo');
    }

    console.log('📄 Subiendo CV para trabajador:', id);
    console.log('📎 Archivo recibido:', file.filename);
    console.log('👤 Usuario que sube:', req.user.id);

    return this.service.update(+id, {
      archivo_cv: file.filename,
      user_id_actua: req.user.id
    });
  }

  // Subir DNI
  @Post(':id/dni')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('dni'))
  async subirDNI(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    if (!file) {
      throw new BadRequestException('No se ha enviado ningún archivo');
    }

    console.log('🆔 Subiendo DNI para trabajador:', id);
    console.log('📎 Archivo recibido:', file.filename);
    console.log('👤 Usuario que sube:', req.user.id);

    return this.service.update(+id, {
      archivo_dni: file.filename,
      user_id_actua: req.user.id
    });
  }

  // Subir CV (perfil propio)
  @Post('perfil/me/cv')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('cv'))
  async subirMiCV(
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    if (!file) {
      throw new BadRequestException('No se ha enviado ningún archivo');
    }

    console.log('📄 Subiendo mi CV, usuario:', req.user.id);
    console.log('📎 Archivo recibido:', file.filename);

    return this.service.update(req.user.id, {
      archivo_cv: file.filename,
      user_id_actua: req.user.id
    });
  }

  // Subir DNI (perfil propio)
  @Post('perfil/me/dni')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('dni'))
  async subirMiDNI(
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    if (!file) {
      throw new BadRequestException('No se ha enviado ningún archivo');
    }

    console.log('🆔 Subiendo mi DNI, usuario:', req.user.id);
    console.log('📎 Archivo recibido:', file.filename);

    return this.service.update(req.user.id, {
      archivo_dni: file.filename,
      user_id_actua: req.user.id
    });
  }

  // Ver/descargar archivo (CV o DNI)
  @Get('archivos/:filename')
  @UseGuards(JwtAuthGuard)
  verArchivo(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = path.join(process.cwd(), 'uploads', 'trabajadores', filename);
    
    console.log('📂 Buscando archivo:', filePath);

    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('Archivo no encontrado');
    }

    // Determinar el tipo de contenido según la extensión
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    return res.sendFile(filePath);
  }

  // Ver mi CV
  @Get('perfil/me/cv')
  @UseGuards(JwtAuthGuard)
  async verMiCV(@Request() req, @Res() res: Response) {
    const trabajador = await this.service.findOneById(req.user.id);
    
    if (!trabajador?.archivo_cv) {
      throw new BadRequestException('No has subido tu CV aún');
    }

    const filePath = path.join(process.cwd(), 'uploads', 'trabajadores', trabajador.archivo_cv);
    
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('Archivo de CV no encontrado');
    }

    const ext = path.extname(trabajador.archivo_cv).toLowerCase();
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    return res.sendFile(filePath);
  }

  // Ver mi DNI
  @Get('perfil/me/dni')
  @UseGuards(JwtAuthGuard)
  async verMiDNI(@Request() req, @Res() res: Response) {
    const trabajador = await this.service.findOneById(req.user.id);
    
    if (!trabajador?.archivo_dni) {
      throw new BadRequestException('No has subido tu DNI aún');
    }

    const filePath = path.join(process.cwd(), 'uploads', 'trabajadores', trabajador.archivo_dni);
    
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException('Archivo de DNI no encontrado');
    }

    const ext = path.extname(trabajador.archivo_dni).toLowerCase();
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    return res.sendFile(filePath);
  }

  // Eliminar CV
  @Delete(':id/cv')
  @UseGuards(JwtAuthGuard)
  async eliminarCV(@Param('id') id: string) {
    console.log('🗑️ Eliminando CV del trabajador:', id);
    return this.service.eliminarArchivo(+id, 'cv');
  }

  // Eliminar DNI
  @Delete(':id/dni')
  @UseGuards(JwtAuthGuard)
  async eliminarDNI(@Param('id') id: string) {
    console.log('🗑️ Eliminando DNI del trabajador:', id);
    return this.service.eliminarArchivo(+id, 'dni');
  }

  @Get(':id/subordinados')
@UseGuards(JwtAuthGuard)
findSubordinados(@Param('id') id: string) {
  return this.service.findSubordinados(+id);
}

  // ============== ENDPOINTS CRUD BÁSICO ==============
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOneById(+id);
  }

  @Post()
  create(@Body() dto: CreateTrabajadorCentroDto) {
    console.log('============ CONTROLLER POST ============');
    console.log('Body recibido en controller:', dto);
    console.log('correo_corporativo recibido:', dto.correo_corporativo);
    console.log('========================================');
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateTrabajadorCentroDto) {
    console.log('============ CONTROLLER PATCH ============');
    console.log('ID recibido:', id);
    console.log('DTO recibido:', JSON.stringify(dto, null, 2));
    console.log('correo_corporativo recibido:', dto.correo_corporativo);
    console.log('==========================================');
    return this.service.update(+id, dto);
  }

  @Put(':id/activar')
  activar(@Param('id') id: string) {
    return this.service.setEstado(+id, true);
  }

  @Put(':id/desactivar')
  desactivar(@Param('id') id: string) {
    return this.service.setEstado(+id, false);
  }
}