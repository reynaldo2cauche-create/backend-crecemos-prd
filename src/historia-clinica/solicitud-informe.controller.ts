import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

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
} from './dto/solicitud-informe.dto';

// ─────────────────────────────────────────────────────────────────────────────
// Ajusta esto al helper que usas en tu proyecto para obtener
// el usuario autenticado desde el request (JWT payload, session, etc.)
// ─────────────────────────────────────────────────────────────────────────────
const ROL_ADMIN     = 1;
const ROL_ADMISION  = 2;
const ROL_TERAPEUTA = 4;

function getAuthUser(req: Request): { id: number; rol_id: number; es_jefe?: boolean } {
  // Ajusta según tu implementación de JWT/guards
  return (req as any).user;
}

function vistaDesdeRol(rolId: number, esJefe: boolean): VistaRol {
  if (rolId === ROL_ADMIN)     return 'admin';
  if (rolId === ROL_ADMISION)  return 'admision';
  if (rolId === ROL_TERAPEUTA) return esJefe ? 'jefa' : 'terapeuta';
  return 'terapeuta'; // fallback seguro
}

@Controller('solicitudes-informe')
export class SolicitudInformeController {
  constructor(private readonly service: SolicitudInformeService) {}

  // ══════════════════════════════════════════════════════════════════════════
  // CRUD BASE
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * POST /solicitudes-informe
   * Solo Admin (1) y Admisión (2) pueden crear.
   */
  @Post()
  create(@Body() dto: CreateSolicitudInformeDto, @Req() req: Request) {
    const { rol_id } = getAuthUser(req);
    if (rol_id !== ROL_ADMIN && rol_id !== ROL_ADMISION) {
      throw new ForbiddenException(
        'Solo Administración o Admisión pueden crear solicitudes de informe.',
      );
    }
    return this.service.create(dto, rol_id);
  }

  /**
   * GET /solicitudes-informe
   * Solo Admin y Admisión ven el listado completo.
   */
  @Get()
  findAll(@Req() req: Request) {
    const { rol_id } = getAuthUser(req);
    if (rol_id !== ROL_ADMIN && rol_id !== ROL_ADMISION) {
      throw new ForbiddenException('No tienes permiso para ver este listado.');
    }
    return this.service.findAll();
  }

  /**
   * GET /solicitudes-informe/:id
   * Todos pueden consultar una solicitud, pero la vista varía según el rol.
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const { rol_id, es_jefe } = getAuthUser(req);
    const vista = vistaDesdeRol(rol_id, !!es_jefe);
    return this.service.findOneByRol(id, vista);
  }

  /**
   * GET /solicitudes-informe/paciente/:pacienteId
   * Todos pueden consultarlo; la vista depende del rol.
   */
  @Get('paciente/:pacienteId')
  findByPaciente(
    @Param('pacienteId', ParseIntPipe) pacienteId: number,
    @Req() req: Request,
  ) {
    const { rol_id, es_jefe } = getAuthUser(req);
    const vista = vistaDesdeRol(rol_id, !!es_jefe);
    return this.service.findByPaciente(pacienteId, vista);
  }

  /**
   * GET /solicitudes-informe/especialista/:especialistaId
   * La terapeuta ve sus propias solicitudes (sin datos financieros).
   * Admin y Admisión también pueden consultar por especialista.
   */
  @Get('especialista/:especialistaId')
  findByEspecialista(
    @Param('especialistaId', ParseIntPipe) especialistaId: number,
    @Req() req: Request,
  ) {
    const { rol_id, id: userId } = getAuthUser(req);

    // Una terapeuta solo puede ver sus propias solicitudes
    if (rol_id === ROL_TERAPEUTA && userId !== especialistaId) {
      throw new ForbiddenException('Solo puedes ver tus propias solicitudes.');
    }

    return this.service.findByEspecialista(especialistaId);
  }

  /**
   * PATCH /solicitudes-informe/:id
   * Solo Admin y Admisión pueden editar datos generales.
   */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSolicitudInformeDto,
    @Req() req: Request,
  ) {
    const { rol_id } = getAuthUser(req);
    if (rol_id !== ROL_ADMIN && rol_id !== ROL_ADMISION) {
      throw new ForbiddenException('No tienes permiso para editar esta solicitud.');
    }
    return this.service.update(id, dto);
  }

  /**
   * DELETE /solicitudes-informe/:id
   * Solo Admin puede eliminar.
   */
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const { rol_id } = getAuthUser(req);
    if (rol_id !== ROL_ADMIN) {
      throw new ForbiddenException('Solo el Administrador puede eliminar solicitudes.');
    }
    return this.service.remove(id);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // WORKFLOW
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * PATCH /solicitudes-informe/:id/subir-archivo
   * Solo terapeutas (ROL 4) pueden subir el archivo.
   * Devuelve la solicitud SIN datos financieros.
   */
  @Patch(':id/subir-archivo')
  subirArchivo(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubirArchivoDto,
    @Req() req: Request,
  ) {
    const { rol_id } = getAuthUser(req);
    if (rol_id !== ROL_TERAPEUTA) {
      throw new ForbiddenException('Solo el terapeuta asignado puede subir el archivo.');
    }
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
    @Req() req: Request,
  ) {
    const { rol_id, es_jefe } = getAuthUser(req);

    // Admins también pueden revisar si lo necesitas; ajusta aquí
    if (rol_id !== ROL_TERAPEUTA && rol_id !== ROL_ADMIN) {
      throw new ForbiddenException('No tienes permiso para revisar informes.');
    }
    if (rol_id === ROL_TERAPEUTA && !es_jefe) {
      throw new ForbiddenException(
        'Solo la jefa / supervisora puede aprobar o rechazar informes.',
      );
    }

    return this.service.revisarInforme(id, dto, !!es_jefe || rol_id === ROL_ADMIN);
  }

  /**
   * PATCH /solicitudes-informe/:id/entregar
   * Solo Admin (1) y Admisión (2) marcan la entrega.
   */
  @Patch(':id/entregar')
  marcarEntregado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarcarEntregadoDto,
    @Req() req: Request,
  ) {
    const { rol_id } = getAuthUser(req);
    if (rol_id !== ROL_ADMIN && rol_id !== ROL_ADMISION) {
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
  // CATÁLOGOS
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
}