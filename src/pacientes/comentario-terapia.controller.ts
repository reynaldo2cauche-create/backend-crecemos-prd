import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ComentarioTerapiaService } from './comentario-terapia.service';
import { CreateComentarioTerapiaDto } from './dto/create-comentario-terapia.dto';

@Controller('comentario-terapia')
export class ComentarioTerapiaController {
  constructor(private readonly comentarioTerapiaService: ComentarioTerapiaService) {}

  @Post()
  create(@Body() createComentarioTerapiaDto: CreateComentarioTerapiaDto) {
    return this.comentarioTerapiaService.create(createComentarioTerapiaDto);
  }

  @Get()
  findAll() {
    return this.comentarioTerapiaService.findAll();
  }

  @Get('paciente-servicio/:id')
  findByPacienteServicio(@Param('id') id: string) {
    return this.comentarioTerapiaService.findByPacienteServicio(+id);
  }

  @Get('terapeuta/:id')
  findByTerapeuta(@Param('id') id: string) {
    return this.comentarioTerapiaService.findByTerapeuta(+id);
  }

  @Get('paciente/:id')
  findByPaciente(@Param('id') id: string) {
    return this.comentarioTerapiaService.findByPaciente(+id);
  }

  @Get('tipo/:tipo')
  findByTipo(@Param('tipo') tipo: string) {
    return this.comentarioTerapiaService.findByTipo(tipo);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.comentarioTerapiaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateComentarioTerapiaDto: Partial<CreateComentarioTerapiaDto>) {
    return this.comentarioTerapiaService.update(+id, updateComentarioTerapiaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.comentarioTerapiaService.remove(+id);
  }
} 