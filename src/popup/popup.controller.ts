import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Param,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { PopupService } from './popup.service';
import { PopupConfiguracion } from './popup-configuracion.entity';

const storage = diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'uploads', 'popup');
    
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    const ext = extname(file.originalname);
    const filename = `popup-${timestamp}-${random}${ext}`;
    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new BadRequestException('Solo se permiten imágenes JPG, PNG, WebP o GIF'), false);
  }

  cb(null, true);
};

@Controller('backend_api/popup')
export class PopupController {
  constructor(private readonly popupService: PopupService) {}

  /**
   * GET /api/popup/configuracion - Obtener configuración actual
   */
  @Get('configuracion')
  async obtenerConfiguracion(): Promise<PopupConfiguracion> {
    return await this.popupService.obtenerConfiguracion();
  }

  /**
   * GET /api/popup/imagen/:filename - Servir imagen del popup
   */
  @Get('imagen/:filename')
  async verImagen(@Param('filename') filename: string, @Res() res: Response) {
    const rutaArchivo = path.join(process.cwd(), 'uploads', 'popup', filename);

    if (!fs.existsSync(rutaArchivo)) {
      throw new BadRequestException('Imagen no encontrada');
    }

    // Determinar el tipo MIME basado en la extensión
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
@Post('imagen')
@HttpCode(HttpStatus.OK)
@UseInterceptors(
  FileInterceptor('imagen', {
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 },
  })
)
async subirImagen(
  @UploadedFile() file: Express.Multer.File,
  @Body('userId') userId: number, // ✅ Recibimos userId
): Promise<any> {
  if (!file) {
    throw new BadRequestException('No se proporcionó archivo');
  }

  if (!userId) {
    throw new BadRequestException('Se requiere userId');
  }

  const config = await this.popupService.subirImagen(file, userId);
  return {
    success: true,
    message: 'Imagen subida correctamente',
    data: config,
  };
}

@Put('configuracion')
async actualizarConfiguracion(
  @Body() body: { activo?: boolean; imagenUrl?: string; userId: number }, // ✅ Agregamos userId
): Promise<PopupConfiguracion> {
  if (!body.userId) {
    throw new BadRequestException('Se requiere userId');
  }

  if (body.activo !== undefined) {
    return await this.popupService.actualizarConfiguracion(body.activo, body.userId);
  }
  
  throw new BadRequestException('Se requiere activo');
}
  /**
   * DELETE /api/popup/imagen - Eliminar imagen del popup
   */
  @Delete('imagen')
  async eliminarImagen(): Promise<{ success: boolean; message: string }> {
    await this.popupService.eliminarImagen();
    return {
      success: true,
      message: 'Imagen eliminada correctamente',
    };
  }
}