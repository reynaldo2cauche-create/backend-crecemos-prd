// src/convenios/convenios.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  Put,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Res,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConveniosService } from './convenios.service';
import { CreateConvenioDto } from './dto/create-convenio.dto';
import { UpdateConvenioDto } from './dto/update-convenio.dto';
import { CreatePacienteConvenioDto } from './dto/create-paciente-convenio.dto';
import { UpdatePacienteConvenioDto } from './dto/update-paciente-convenio.dto';
import { CreateBeneficioDto } from './dto/create-beneficio.dto';
import { UpdateBeneficioDto } from './dto/update-beneficio.dto';
import { CreateBeneficioTerminoDto } from './dto/create-beneficio-termino.dto';
import { UpdateBeneficioTerminoDto } from './dto/update-beneficio-termino.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Auditable } from '../auditoria/decorators/auditable.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Response } from 'express';
import { extname } from 'path';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('Convenios')
@Controller('backend_api/convenios')
@UseGuards(JwtAuthGuard)
export class ConveniosController {
  constructor(private readonly conveniosService: ConveniosService) {}

  // =============== CONVENIOS ===============

  @Post()
  @UseInterceptors(FileInterceptor('logo'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Crear un nuevo convenio con logo',
    schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string' },
        descripcion: { type: 'string', nullable: true },
        activo: { type: 'boolean', default: true },
        logo: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen (JPEG, PNG, JPG, WEBP)'
        },
      },
    },
  })
  @ApiOperation({ summary: 'Crear un nuevo convenio' })
  @ApiResponse({ status: 201, description: 'Convenio creado exitosamente' })
  // @Auditable({
  //   modulo: 'CONVENIOS',
  //   accion: 'CREAR_CONVENIO',
  // })
  async create(
    @Body() dto: CreateConvenioDto,
    @Request() req,
    @UploadedFile()
    file?: Express.Multer.File,
  ) {
    console.log('🎯 [CONTROLLER] Archivo recibido:', file ? {
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size
    } : 'Sin archivo');

    return this.conveniosService.create(dto, req.user?.id, file);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Obtener todos los convenios' })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Lista de convenios' })
  findAll(@Query('activo') activo?: string) {
    const activoBoolean = activo === 'true' ? true : activo === 'false' ? false : undefined;
    return this.conveniosService.findAll(activoBoolean);
  }

  @Public()
  @Get('logo/:filename')
  @ApiOperation({ summary: 'Obtener logo de convenio' })
  async getLogo(@Param('filename') filename: string, @Res() res: Response) {
    const rutaArchivo = path.join(process.cwd(), 'uploads', 'convenios', filename);

    if (!fs.existsSync(rutaArchivo)) {
      throw new BadRequestException('Logo no encontrado');
    }

    const ext = extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000');

    const fileStream = fs.createReadStream(rutaArchivo);
    fileStream.pipe(res);
  }

  // =============== PACIENTE-CONVENIO ===============

  @Post('pacientes')
  @ApiOperation({ summary: 'Asignar un convenio a un paciente' })
  @ApiResponse({ status: 201, description: 'Convenio asignado al paciente exitosamente' })
  @ApiResponse({ status: 409, description: 'El paciente ya tiene este convenio asignado' })
  @Auditable({
    modulo: 'CONVENIOS',
    accion: 'ASIGNAR_CONVENIO_PACIENTE',
  })
  asignarConvenioAPaciente(@Body() dto: CreatePacienteConvenioDto, @Request() req) {
    return this.conveniosService.asignarConvenioAPaciente(dto, req.user?.id);
  }

  @Get('paciente/:pacienteId')
  @ApiOperation({ summary: 'Obtener todos los convenios de un paciente' })
  @ApiParam({ name: 'pacienteId', description: 'ID del paciente' })
  @ApiResponse({ status: 200, description: 'Lista de convenios del paciente' })
  findConveniosByPaciente(@Param('pacienteId') pacienteId: string) {
    return this.conveniosService.findConveniosByPaciente(+pacienteId);
  }

  @Get('pacientes/por-convenio/:convenioId')
  @ApiOperation({ summary: 'Obtener todos los pacientes de un convenio' })
  @ApiParam({ name: 'convenioId', description: 'ID del convenio' })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Lista de pacientes del convenio' })
  findPacientesByConvenio(
    @Param('convenioId') convenioId: string,
    @Query('activo') activo?: string,
  ) {
    const activoBoolean = activo === 'true' ? true : activo === 'false' ? false : undefined;
    return this.conveniosService.findPacientesByConvenio(+convenioId, activoBoolean);
  }

  @Get('pacientes/:id')
  @ApiOperation({ summary: 'Obtener una relación paciente-convenio por ID' })
  @ApiParam({ name: 'id', description: 'ID de la relación paciente-convenio' })
  @ApiResponse({ status: 200, description: 'Relación encontrada' })
  @ApiResponse({ status: 404, description: 'Relación no encontrada' })
  findOnePacienteConvenio(@Param('id') id: string) {
    return this.conveniosService.findOnePacienteConvenio(+id);
  }

  @Patch('pacientes/:id')
  @ApiOperation({ summary: 'Actualizar una relación paciente-convenio' })
  @ApiParam({ name: 'id', description: 'ID de la relación' })
  @ApiResponse({ status: 200, description: 'Relación actualizada exitosamente' })
  @Auditable({
    modulo: 'CONVENIOS',
    accion: 'EDITAR_PACIENTE_CONVENIO',
  })
  updatePacienteConvenio(
    @Param('id') id: string,
    @Body() dto: UpdatePacienteConvenioDto,
    @Request() req,
  ) {
    return this.conveniosService.updatePacienteConvenio(+id, dto, req.user?.id);
  }

  @Delete('pacientes/:id')
  @ApiOperation({ summary: 'Eliminar una relación paciente-convenio' })
  @ApiParam({ name: 'id', description: 'ID de la relación' })
  @ApiResponse({ status: 200, description: 'Relación eliminada exitosamente' })
  @Auditable({
    modulo: 'CONVENIOS',
    accion: 'ELIMINAR_PACIENTE_CONVENIO',
  })
  removePacienteConvenio(@Param('id') id: string) {
    return this.conveniosService.removePacienteConvenio(+id);
  }

  @Put('pacientes/:id/activar')
  @ApiOperation({ summary: 'Activar una relación paciente-convenio' })
  @ApiParam({ name: 'id', description: 'ID de la relación' })
  @ApiResponse({ status: 200, description: 'Relación activada exitosamente' })
  @Auditable({
    modulo: 'CONVENIOS',
    accion: 'ACTIVAR_PACIENTE_CONVENIO',
  })
  activarPacienteConvenio(@Param('id') id: string, @Request() req) {
    return this.conveniosService.setEstadoPacienteConvenio(+id, true, req.user?.id);
  }

  @Put('pacientes/:id/desactivar')
  @ApiOperation({ summary: 'Desactivar una relación paciente-convenio' })
  @ApiParam({ name: 'id', description: 'ID de la relación' })
  @ApiResponse({ status: 200, description: 'Relación desactivada exitosamente' })
  @Auditable({
    modulo: 'CONVENIOS',
    accion: 'DESACTIVAR_PACIENTE_CONVENIO',
  })
  desactivarPacienteConvenio(@Param('id') id: string, @Request() req) {
    return this.conveniosService.setEstadoPacienteConvenio(+id, false, req.user?.id);
  }

  // =============== BENEFICIOS ===============

  @Post('beneficios')
  @ApiOperation({ summary: 'Crear un nuevo beneficio' })
  @ApiResponse({ status: 201, description: 'Beneficio creado exitosamente' })
  createBeneficio(@Body() dto: CreateBeneficioDto, @Request() req) {
    return this.conveniosService.createBeneficio(dto, req.user?.id);
  }

  @Get('categorias-beneficios')
  @ApiOperation({ summary: 'Obtener todas las categorías de beneficios' })
  @ApiResponse({ status: 200, description: 'Lista de categorías de beneficios' })
  findAllCategoriasBeneficios() {
    return this.conveniosService.findAllCategoriasBeneficios();
  }

  @Get('beneficios')
  @ApiOperation({ summary: 'Obtener todos los beneficios' })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  @ApiQuery({ name: 'convenio_id', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de beneficios' })
  findAllBeneficios(
    @Query('activo') activo?: string,
    @Query('convenio_id') convenio_id?: string
  ) {
    const activoBoolean = activo === 'true' ? true : activo === 'false' ? false : undefined;
    const convenioIdNumber = convenio_id ? +convenio_id : undefined;
    return this.conveniosService.findAllBeneficios(activoBoolean, convenioIdNumber);
  }

  @Get('beneficios/:id')
  @ApiOperation({ summary: 'Obtener un beneficio por ID' })
  @ApiParam({ name: 'id', description: 'ID del beneficio' })
  @ApiResponse({ status: 200, description: 'Beneficio encontrado' })
  @ApiResponse({ status: 404, description: 'Beneficio no encontrado' })
  findOneBeneficio(@Param('id') id: string) {
    return this.conveniosService.findOneBeneficio(+id);
  }

  @Patch('beneficios/:id')
  @ApiOperation({ summary: 'Actualizar un beneficio' })
  @ApiParam({ name: 'id', description: 'ID del beneficio' })
  @ApiResponse({ status: 200, description: 'Beneficio actualizado exitosamente' })
  updateBeneficio(
    @Param('id') id: string,
    @Body() dto: UpdateBeneficioDto,
    @Request() req,
  ) {
    return this.conveniosService.updateBeneficio(+id, dto, req.user?.id);
  }

  @Delete('beneficios/:id')
  @ApiOperation({ summary: 'Eliminar un beneficio' })
  @ApiParam({ name: 'id', description: 'ID del beneficio' })
  @ApiResponse({ status: 200, description: 'Beneficio eliminado exitosamente' })
  @ApiResponse({ status: 400, description: 'No se puede eliminar, tiene convenios asociados' })
  removeBeneficio(@Param('id') id: string) {
    return this.conveniosService.removeBeneficio(+id);
  }

  @Put('beneficios/:id/activar')
  @ApiOperation({ summary: 'Activar un beneficio' })
  @ApiParam({ name: 'id', description: 'ID del beneficio' })
  @ApiResponse({ status: 200, description: 'Beneficio activado exitosamente' })
  activarBeneficio(@Param('id') id: string, @Request() req) {
    return this.conveniosService.setEstadoBeneficio(+id, true, req.user?.id);
  }

  @Put('beneficios/:id/desactivar')
  @ApiOperation({ summary: 'Desactivar un beneficio' })
  @ApiParam({ name: 'id', description: 'ID del beneficio' })
  @ApiResponse({ status: 200, description: 'Beneficio desactivado exitosamente' })
  desactivarBeneficio(@Param('id') id: string, @Request() req) {
    return this.conveniosService.setEstadoBeneficio(+id, false, req.user?.id);
  }

  // =============== TÉRMINOS Y CONDICIONES DE BENEFICIOS ===============
  // IMPORTANTE: Estas rutas deben ir ANTES de 'beneficios/:id' para evitar conflictos

  @Post('beneficios/terminos')
  @ApiOperation({ summary: 'Crear un nuevo término o condición para un beneficio' })
  @ApiResponse({ status: 201, description: 'Término creado exitosamente' })
  createBeneficioTermino(@Body() dto: CreateBeneficioTerminoDto, @Request() req) {
    return this.conveniosService.createBeneficioTermino(dto);
  }

  @Get('beneficios/terminos/:id/activar')
  @ApiOperation({ summary: 'Activar un término' })
  @ApiParam({ name: 'id', description: 'ID del término' })
  @ApiResponse({ status: 200, description: 'Término activado exitosamente' })
  activarBeneficioTermino(@Param('id') id: string, @Request() req) {
    return this.conveniosService.setEstadoBeneficioTermino(+id, true);
  }

  @Get('beneficios/terminos/:id/desactivar')
  @ApiOperation({ summary: 'Desactivar un término' })
  @ApiParam({ name: 'id', description: 'ID del término' })
  @ApiResponse({ status: 200, description: 'Término desactivado exitosamente' })
  desactivarBeneficioTermino(@Param('id') id: string, @Request() req) {
    return this.conveniosService.setEstadoBeneficioTermino(+id, false);
  }

  @Get('beneficios/terminos/:id')
  @ApiOperation({ summary: 'Obtener un término por ID' })
  @ApiParam({ name: 'id', description: 'ID del término' })
  @ApiResponse({ status: 200, description: 'Término encontrado' })
  @ApiResponse({ status: 404, description: 'Término no encontrado' })
  findOneBeneficioTermino(@Param('id') id: string) {
    return this.conveniosService.findOneBeneficioTermino(+id);
  }

  @Patch('beneficios/terminos/:id')
  @ApiOperation({ summary: 'Actualizar un término' })
  @ApiParam({ name: 'id', description: 'ID del término' })
  @ApiResponse({ status: 200, description: 'Término actualizado exitosamente' })
  updateBeneficioTermino(
    @Param('id') id: string,
    @Body() dto: UpdateBeneficioTerminoDto,
    @Request() req
  ) {
    return this.conveniosService.updateBeneficioTermino(+id, dto);
  }

  @Delete('beneficios/terminos/:id')
  @ApiOperation({ summary: 'Eliminar un término' })
  @ApiParam({ name: 'id', description: 'ID del término' })
  @ApiResponse({ status: 200, description: 'Término eliminado exitosamente' })
  removeBeneficioTermino(@Param('id') id: string) {
    return this.conveniosService.removeBeneficioTermino(+id);
  }

  @Public()
  @Get('beneficios/:beneficioId/terminos')
  @ApiOperation({ summary: 'Obtener todos los términos de un beneficio' })
  @ApiParam({ name: 'beneficioId', description: 'ID del beneficio' })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Lista de términos del beneficio' })
  findTerminosByBeneficio(
    @Param('beneficioId') beneficioId: string,
    @Query('activo') activo?: string
  ) {
    const activoBoolean = activo === 'true' ? true : activo === 'false' ? false : undefined;
    return this.conveniosService.findTerminosByBeneficio(+beneficioId, activoBoolean);
  }

  // =============== CONVENIO BY ID ===============
  // NOTA: Estas rutas deben estar AL FINAL para no capturar rutas específicas

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un convenio por ID' })
  @ApiParam({ name: 'id', description: 'ID del convenio' })
  @ApiResponse({ status: 200, description: 'Convenio encontrado' })
  @ApiResponse({ status: 404, description: 'Convenio no encontrado' })
  @Auditable({
    modulo: 'CONVENIOS',
    accion: 'VER_CONVENIO',
  })
  findOne(@Param('id') id: string) {
    return this.conveniosService.findOne(+id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('logo'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Actualizar un convenio con logo',
    schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string', nullable: true },
        descripcion: { type: 'string', nullable: true },
        activo: { type: 'boolean', nullable: true },
        logo: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de imagen (JPEG, PNG, JPG, WEBP)'
        },
      },
    },
  })
  @ApiOperation({ summary: 'Actualizar un convenio' })
  @ApiParam({ name: 'id', description: 'ID del convenio' })
  @ApiResponse({ status: 200, description: 'Convenio actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Convenio no encontrado' })
  @Auditable({
    modulo: 'CONVENIOS',
    accion: 'EDITAR_CONVENIO',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateConvenioDto,
    @Request() req,
    @UploadedFile()
    file?: Express.Multer.File,
  ) {
    console.log('🎯 [CONTROLLER UPDATE] Archivo recibido:', file ? {
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size
    } : 'Sin archivo');

    return this.conveniosService.update(+id, dto, req.user?.id, file);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un convenio' })
  @ApiParam({ name: 'id', description: 'ID del convenio' })
  @ApiResponse({ status: 200, description: 'Convenio eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Convenio no encontrado' })
  @ApiResponse({ status: 400, description: 'No se puede eliminar, tiene pacientes asociados' })
  @Auditable({
    modulo: 'CONVENIOS',
    accion: 'ELIMINAR_CONVENIO',
  })
  remove(@Param('id') id: string) {
    return this.conveniosService.remove(+id);
  }

  @Put(':id/activar')
  @ApiOperation({ summary: 'Activar un convenio' })
  @ApiParam({ name: 'id', description: 'ID del convenio' })
  @ApiResponse({ status: 200, description: 'Convenio activado exitosamente' })
  @Auditable({
    modulo: 'CONVENIOS',
    accion: 'ACTIVAR_CONVENIO',
  })
  activar(@Param('id') id: string, @Request() req) {
    return this.conveniosService.setEstado(+id, true, req.user?.id);
  }

  @Put(':id/desactivar')
  @ApiOperation({ summary: 'Desactivar un convenio' })
  @ApiParam({ name: 'id', description: 'ID del convenio' })
  @ApiResponse({ status: 200, description: 'Convenio desactivado exitosamente' })
  @Auditable({
    modulo: 'CONVENIOS',
    accion: 'DESACTIVAR_CONVENIO',
  })
  desactivar(@Param('id') id: string, @Request() req) {
    return this.conveniosService.setEstado(+id, false, req.user?.id);
  }
}