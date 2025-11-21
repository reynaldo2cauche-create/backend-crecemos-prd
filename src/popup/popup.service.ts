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
   * Actualizar configuración (activar/desactivar)
   */
  async actualizarConfiguracion(activo: boolean): Promise<PopupConfiguracion> {
    let config = await this.popupRepository.findOne({ where: { id: 1 } });

    if (!config) {
      config = this.popupRepository.create({ activo });
    } else {
      config.activo = activo;
    }

    return await this.popupRepository.save(config);
  }

  /**
   * Subir imagen del popup - CORRECTO
   */
  async subirImagen(file: Express.Multer.File): Promise<PopupConfiguracion> {
    if (!file) {
      throw new BadRequestException('No se proporcionó archivo');
    }

    let config = await this.popupRepository.findOne({ where: { id: 1 } });

    // Eliminar imagen anterior si existe
    if (config && config.imagenUrl) {
      this.eliminarArchivoFisico(config.imagenUrl);
    }

    // Guardar el nombre exacto que multer generó
    const imagenUrl = file.filename;

    console.log('💾 Guardando en BD:', imagenUrl);

    if (!config) {
      config = this.popupRepository.create({
        activo: true,
        imagenUrl,
      });
    } else {
      config.imagenUrl = imagenUrl;
      config.activo = true;
    }

    const resultado = await this.popupRepository.save(config);
    console.log('✓ Guardado correctamente:', resultado.imagenUrl);
    return resultado;
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