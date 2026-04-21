import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Patch,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Param,
  Res,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { PopupService } from './popup.service';
import { PopupProgramado } from './popup-programado.entity';
import { CrearPopupDto } from './dto/crear-popup.dto';
import { ActualizarPopupDto } from './dto/actualizar-popup.dto';

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
   * GET /backend_api/popup/activo - Obtener popup activo actual (PÚBLICO)
   */
  @Get('activo')
  async obtenerPopupActivo(): Promise<{ activo: boolean; popup: PopupProgramado | null }> {
    return await this.popupService.obtenerPopupActivo();
  }

  /**
   * GET /backend_api/popup/lista - Listar todos los popups (ADMIN)
   */
  @Get('lista')
  async listarPopups(): Promise<PopupProgramado[]> {
    return await this.popupService.listarPopups();
  }

  /**
   * GET /backend_api/popup/:id - Obtener popup por ID (ADMIN)
   */
  @Get(':id')
  async obtenerPopupPorId(@Param('id', ParseIntPipe) id: number): Promise<PopupProgramado> {
    return await this.popupService.obtenerPopupPorId(id);
  }

  /**
   * GET /backend_api/popup/imagen/:filename - Servir imagen
   */
  @Get('imagen/:filename')
  async verImagen(@Param('filename') filename: string, @Res() res: Response) {
    const rutaArchivo = path.join(process.cwd(), 'uploads', 'popup', filename);

    if (!fs.existsSync(rutaArchivo)) {
      throw new BadRequestException('Imagen no encontrada');
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

  /**
   * POST /backend_api/popup/crear - Crear nuevo popup programado (ADMIN)
   */
  @Post('crear')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('imagen', {
      storage,
      fileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    })
  )
  async crearPopup(
    @UploadedFile() file: Express.Multer.File,
    @Body() crearPopupDto: CrearPopupDto,
  ): Promise<{ success: boolean; message: string; popup: PopupProgramado }> {
    if (!file) {
      throw new BadRequestException('Se requiere una imagen');
    }

    if (!crearPopupDto.userId) {
      throw new BadRequestException('Se requiere userId');
    }

    const popup = await this.popupService.crearPopup(
      crearPopupDto,
      file,
      Number(crearPopupDto.userId)
    );

    return {
      success: true,
      message: 'Popup creado correctamente',
      popup,
    };
  }

  /**
   * PUT /backend_api/popup/:id - Actualizar popup existente (ADMIN)
   */
  @Put(':id')
  @UseInterceptors(
    FileInterceptor('imagen', {
      storage,
      fileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    })
  )
  async actualizarPopup(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() actualizarPopupDto: ActualizarPopupDto,
  ): Promise<{ success: boolean; message: string; popup: PopupProgramado }> {
    if (!actualizarPopupDto.userId) {
      throw new BadRequestException('Se requiere userId');
    }

    const popup = await this.popupService.actualizarPopup(
      id,
      actualizarPopupDto,
      file || null,
      Number(actualizarPopupDto.userId)
    );

    return {
      success: true,
      message: 'Popup actualizado correctamente',
      popup,
    };
  }

  /**
   * DELETE /backend_api/popup/:id - Eliminar popup (ADMIN)
   */
  @Delete(':id')
  async eliminarPopup(
    @Param('id', ParseIntPipe) id: number
  ): Promise<{ success: boolean; message: string }> {
    await this.popupService.eliminarPopup(id);

    return {
      success: true,
      message: 'Popup eliminado correctamente',
    };
  }

  /**
   * PATCH /backend_api/popup/:id/toggle - Activar/Desactivar popup (ADMIN)
   */
  @Patch(':id/toggle')
  async toggleActivo(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { activo: boolean; userId: number }
  ): Promise<{ success: boolean; message: string; popup: PopupProgramado }> {
    if (body.activo === undefined) {
      throw new BadRequestException('Se requiere el campo activo');
    }

    if (!body.userId) {
      throw new BadRequestException('Se requiere userId');
    }

    const popup = await this.popupService.toggleActivo(id, body.activo, body.userId);

    return {
      success: true,
      message: `Popup ${body.activo ? 'activado' : 'desactivado'} correctamente`,
      popup,
    };
  }
}
