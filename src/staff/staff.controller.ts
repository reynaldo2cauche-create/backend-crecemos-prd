import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Patch, UseInterceptors, UploadedFile, Res, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { Response } from 'express';
import * as fs from 'fs';
import { StaffService } from './staff.service';
import { CrearStaffDto } from './dto/crear-staff.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('backend_api/staff')
@UseGuards(JwtAuthGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Public()
  @Get()
  async listar() {
    return this.staffService.listar();
  }

  @Public()
  @Get('activos')
  async listarActivos() {
    return this.staffService.listarActivos();
  }
  

  @Public()
  @Get('foto/:filename')
  async getFoto(@Param('filename') filename: string, @Res() res: Response) {
    const rutaArchivo = join(process.cwd(), 'uploads', 'staff', filename);

    if (!fs.existsSync(rutaArchivo)) {
      throw new BadRequestException('Foto no encontrada');
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

  @Get(':id')
  async obtenerPorId(@Param('id') id: string) {
    return this.staffService.obtenerPorId(+id);
  }

  @Post()
  async crear(@Body() dto: CrearStaffDto) {
    return this.staffService.crear(dto);
  }

  @Put(':id')
  async actualizar(@Param('id') id: string, @Body() dto: CrearStaffDto) {
    return this.staffService.actualizar(+id, dto);
  }

  @Delete(':id')
  async eliminar(@Param('id') id: string) {
    await this.staffService.eliminar(+id);
    return { message: 'Staff eliminado correctamente' };
  }

  @Patch(':id/estado')
  async cambiarEstado(@Param('id') id: string, @Body('activo') activo: boolean) {
    return this.staffService.cambiarEstado(+id, activo);
  }

  @Post('upload-foto')
  @UseInterceptors(
    FileInterceptor('foto', {
      storage: diskStorage({
        destination: './uploads/staff',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new Error('Solo se permiten imágenes'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadFoto(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('No se ha subido ningún archivo');
    }
    const url = `/uploads/staff/${file.filename}`;
    return { url };
  }
}
