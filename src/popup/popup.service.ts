import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PopupConfiguracion } from './popup-configuracion.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PopupService {
  constructor(
    @InjectRepository(PopupConfiguracion)
    private readonly popupRepository: Repository<PopupConfiguracion>,
  ) {}

  /**
   * Obtener la configuración actual del popup
   */
  async obtenerConfiguracion(): Promise<PopupConfiguracion> {
    let config = await this.popupRepository.findOne({ where: { id: 1 } });

    if (!config) {
      config = this.popupRepository.create({
        activo: false,
        imagenUrl: null,
      });
      await this.popupRepository.save(config);
    }

    return config;
  }

  

  /**
   * Subir imagen del popup - CORRECTO
   */
 async subirImagen(file: Express.Multer.File, userId: number): Promise<PopupConfiguracion> {
  if (!file) {
    throw new BadRequestException('No se proporcionó archivo');
  }

  let config = await this.popupRepository.findOne({ where: { id: 1 } });

  // Eliminar imagen anterior si existe
  if (config && config.imagenUrl) {
    this.eliminarArchivoFisico(config.imagenUrl);
  }

  const imagenUrl = file.filename;

  if (!config) {
    // ✅ CREAR: guardamos user_id_crea
    config = this.popupRepository.create({
      activo: true,
      imagenUrl,
      userIdCrea: userId,
      userIdActua: userId
    });
  } else {
    // ✅ ACTUALIZAR: guardamos user_id_actua
    config.imagenUrl = imagenUrl;
    config.activo = true;
    config.userIdActua = userId;
  }

  return await this.popupRepository.save(config);
}

/**
   * Actualizar configuración (activar/desactivar)
   */

async actualizarConfiguracion(activo: boolean, userId: number): Promise<PopupConfiguracion> {
  let config = await this.popupRepository.findOne({ where: { id: 1 } });

  if (!config) {
    config = this.popupRepository.create({ 
      activo,
      userIdCrea: userId,
      userIdActua: userId
    });
  } else {
    config.activo = activo;
    config.userIdActua = userId; // ✅ Actualizamos quién modificó
  }

  return await this.popupRepository.save(config);
}

  /**
   * Actualizar URL de imagen
   */
  async actualizarImagenUrl(imagenUrl: string): Promise<PopupConfiguracion> {
    let config = await this.popupRepository.findOne({ where: { id: 1 } });

    if (!config) {
      config = this.popupRepository.create({
        activo: false,
        imagenUrl,
      });
    } else {
      if (config.imagenUrl) {
        this.eliminarArchivoFisico(config.imagenUrl);
      }
      config.imagenUrl = imagenUrl;
    }

    return await this.popupRepository.save(config);
  }

  /**
   * Eliminar imagen del popup
   */
  async eliminarImagen(): Promise<void> {
    const config = await this.popupRepository.findOne({ where: { id: 1 } });

    if (!config) {
      throw new NotFoundException('Configuración no encontrada');
    }

    if (config.imagenUrl) {
      this.eliminarArchivoFisico(config.imagenUrl);
    }

    config.imagenUrl = null;
    config.activo = false;
    await this.popupRepository.save(config);
  }

  /**
   * Eliminar archivo físico del servidor
   */
  private eliminarArchivoFisico(imagenUrl: string): void {
    try {
      const rutaArchivo = path.join(process.cwd(), 'uploads', 'popup', imagenUrl);

      if (fs.existsSync(rutaArchivo)) {
        fs.unlinkSync(rutaArchivo);
        console.log('✓ Archivo eliminado:', rutaArchivo);
      }
    } catch (error) {
      console.error('Error al eliminar archivo:', error);
    }
  }
}