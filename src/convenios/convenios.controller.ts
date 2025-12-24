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
  FileTypeValidator
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConveniosService } from './convenios.service';
import { CreateConvenioDto } from './dto/create-convenio.dto';
import { UpdateConvenioDto } from './dto/update-convenio.dto';
import { CreatePacienteConvenioDto } from './dto/create-paciente-convenio.dto';
import { UpdatePacienteConvenioDto } from './dto/update-paciente-convenio.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Auditable } from '../auditoria/decorators/auditable.decorator';

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
  @Auditable({
    modulo: 'CONVENIOS',
    accion: 'CREAR_CONVENIO',
  })
  async create(
    @Body() dto: CreateConvenioDto,
    @Request() req,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
   
    return this.conveniosService.create(dto, req.user?.id, file);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los convenios' })
  @ApiQuery({ name: 'activo', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Lista de convenios' })
  findAll(@Query('activo') activo?: string) {
    const activoBoolean = activo === 'true' ? true : activo === 'false' ? false : undefined;
    return this.conveniosService.findAll(activoBoolean);
  }

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
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
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
  // ... (el resto del código permanece igual)
}