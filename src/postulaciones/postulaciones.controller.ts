import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  Res,
  StreamableFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { createReadStream } from 'fs';
import { PostulacionesService } from './postulaciones.service';
import { CreatePostulacionDto } from './dto/create-postulacion.dto';
import { UpdatePostulacionDto } from './dto/update-postulacion.dto';
import { CreateComentarioDto } from './dto/create-comentario.dto';
import { Postulacion } from './postulacion.entity';
import { Comentario } from './comentario.entity';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('backend_api/postulaciones')
export class PostulacionesController {
  constructor(private readonly postulacionesService: PostulacionesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('cv', {
    storage: diskStorage({
      destination: './uploads/cvs',
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = extname(file.originalname);
        callback(null, `cv-${uniqueSuffix}${ext}`);
      },
    }),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, callback) => {
      if (file.mimetype === 'application/pdf') {
        callback(null, true);
      } else {
        callback(new Error('Solo se permiten archivos PDF'), false);
      }
    },
  }))
  async create(
    @Body() createPostulacionDto: CreatePostulacionDto,
    @UploadedFile() cv: Express.Multer.File,
  ): Promise<Postulacion> {
    
    if (!cv) {
      throw new BadRequestException('El archivo CV es obligatorio');
    }
    
    return await this.postulacionesService.create(createPostulacionDto, cv);
  }

  // ✅ RUTAS ESPECÍFICAS PRIMERO
  @Get('estadisticas')
  async getEstadisticas() {
    return await this.postulacionesService.getEstadisticas();
  }

  @Post('comentarios')
  async addComentario(@Body() createComentarioDto: CreateComentarioDto): Promise<Comentario> {
    return await this.postulacionesService.addComentario(createComentarioDto);
  }

  @Get()
  async findAll(
    @Query('estado') estado?: string,
    @Query('distrito') distrito?: string,
    @Query('cargo') cargo?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('search') search?: string,
  ): Promise<Postulacion[]> {
    const filters = {
      estado_postulacion: estado,
      distrito,
      cargo_postulado: cargo,
      fechaInicio: fechaInicio ? new Date(fechaInicio) : undefined,
      fechaFin: fechaFin ? new Date(fechaFin) : undefined,
      search,
    };
    return await this.postulacionesService.findAll(filters);
  }

  // ✅ RUTAS DE CV ANTES DE :id
  @Get(':id/cv/download')
  async downloadCV(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { filepath, filename } = await this.postulacionesService.getCVFile(id);
    
    
    const file = createReadStream(filepath);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    
    return new StreamableFile(file);
  }

  @Get(':id/cv')
  async getCV(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { filepath, filename } = await this.postulacionesService.getCVFile(id);
    
    
    const file = createReadStream(filepath);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    });
    
    return new StreamableFile(file);
  }

  @Get(':id/comentarios')
  async getComentarios(@Param('id', ParseIntPipe) id: number): Promise<Comentario[]> {
    return await this.postulacionesService.getComentariosByPostulacion(id);
  }

  // ✅ RUTAS CON :id AL FINAL
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Postulacion> {
    return await this.postulacionesService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePostulacionDto: UpdatePostulacionDto,
  ): Promise<Postulacion> {
    return await this.postulacionesService.update(id, updatePostulacionDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return await this.postulacionesService.remove(id);
  }
}