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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SolicitudInformeService } from './solicitud-informe.service';
import { CreateSolicitudInformeDto } from './dto/create-solicitud-informe.dto';
import { UpdateSolicitudInformeDto } from './dto/update-solicitud-informe.dto';

@ApiTags('Solicitud de Informe')
@Controller('backend_api/solicitud-informe')
@UseGuards(JwtAuthGuard)
export class SolicitudInformeController {
  constructor(private readonly solicitudInformeService: SolicitudInformeService) {}

  // =============== CATÁLOGOS (DEBEN IR PRIMERO) ===============

  @Get('catalogos/modalidades-pago')
  @ApiOperation({ summary: 'Obtener todas las modalidades de pago' })
  @ApiResponse({ status: 200, description: 'Lista de modalidades de pago' })
  async findAllModalidadesPago() {
    return await this.solicitudInformeService.findAllModalidadesPago();
  }

  @Get('catalogos/estados-pago')
  @ApiOperation({ summary: 'Obtener todos los estados de pago' })
  @ApiResponse({ status: 200, description: 'Lista de estados de pago' })
  async findAllEstadosPago() {
    return await this.solicitudInformeService.findAllEstadosPago();
  }

  // =============== SOLICITUDES DE INFORME ===============

  @Post()
  @ApiOperation({ summary: 'Crear una nueva solicitud de informe' })
  @ApiResponse({ status: 201, description: 'Solicitud creada exitosamente' })
  async create(@Body() dto: CreateSolicitudInformeDto, @Request() req) {
    const userId = req.user?.id;
    dto.user_crea_id = userId;
    return await this.solicitudInformeService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las solicitudes de informe' })
  @ApiResponse({ status: 200, description: 'Lista de solicitudes' })
  async findAll() {
    return await this.solicitudInformeService.findAll();
  }

  @Get('paciente/:pacienteId')
  @ApiOperation({ summary: 'Obtener solicitudes de informe por paciente' })
  @ApiParam({ name: 'pacienteId', description: 'ID del paciente' })
  @ApiResponse({ status: 200, description: 'Lista de solicitudes del paciente' })
  async findByPaciente(@Param('pacienteId', ParseIntPipe) pacienteId: number) {
    return await this.solicitudInformeService.findByPaciente(pacienteId);
  }

  @Get('especialista/:especialistaId')
  @ApiOperation({ summary: 'Obtener solicitudes de informe por especialista' })
  @ApiParam({ name: 'especialistaId', description: 'ID del especialista' })
  @ApiResponse({ status: 200, description: 'Lista de solicitudes del especialista' })
  async findByEspecialista(@Param('especialistaId', ParseIntPipe) especialistaId: number) {
    return await this.solicitudInformeService.findByEspecialista(especialistaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una solicitud de informe por ID' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud encontrada' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.solicitudInformeService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una solicitud de informe' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSolicitudInformeDto,
    @Request() req,
  ) {
    const userId = req.user?.id;
    dto.user_actua_id = userId;
    return await this.solicitudInformeService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una solicitud de informe' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.solicitudInformeService.remove(id);
    return { message: 'Solicitud eliminada exitosamente' };
  }
}
