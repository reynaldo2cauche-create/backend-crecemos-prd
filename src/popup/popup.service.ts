import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { PopupProgramado } from './popup-programado.entity';
import { CrearPopupDto } from './dto/crear-popup.dto';
import { ActualizarPopupDto } from './dto/actualizar-popup.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PopupService {
  constructor(
    @InjectRepository(PopupProgramado)
    private readonly popupRepository: Repository<PopupProgramado>,
  ) {}

  /**
   * Convertir fecha de UTC a hora local de Perú (UTC-5)
   */
  private convertirUTCaPeruano(fecha: Date): Date {
    const fechaUTC = new Date(fecha);
    // Restar 5 horas para convertir a hora peruana
    fechaUTC.setHours(fechaUTC.getHours() - 5);
    return fechaUTC;
  }

  /**
   * Convertir fecha de hora local de Perú (UTC-5) a UTC
   */
  private convertirPeruanoAUTC(fecha: Date): Date {
    const fechaLocal = new Date(fecha);
    // Sumar 5 horas para convertir a UTC
    fechaLocal.setHours(fechaLocal.getHours() + 5);
    return fechaLocal;
  }

  /**
   * Obtener popup activo actual según fecha
   */
  async obtenerPopupActivo(): Promise<{ activo: boolean; popup: PopupProgramado | null }> {
    // Obtener la hora actual en UTC
    const ahoraUTC = new Date();
    
    // Convertir a hora peruana para la comparación
    const ahoraPeruano = this.convertirUTCaPeruano(ahoraUTC);



    const popup = await this.popupRepository.findOne({
      where: {
        activo: true,
        fechaInicio: LessThanOrEqual(ahoraPeruano),
        fechaFin: MoreThanOrEqual(ahoraPeruano),
      },
      order: {
        fechaInicio: 'DESC',
      },
    });

    if (!popup) {
      return { activo: false, popup: null };
    }

    // Convertir las fechas del popup a UTC para enviar al frontend
    const popupConFechasUTC = {
      ...popup,
      fechaInicio: this.convertirPeruanoAUTC(popup.fechaInicio),
      fechaFin: this.convertirPeruanoAUTC(popup.fechaFin),
    };

    return { activo: true, popup: popupConFechasUTC as PopupProgramado };
  }

  /**
   * Listar todos los popups programados
   */
  async listarPopups(): Promise<PopupProgramado[]> {
    const popups = await this.popupRepository.find({
      order: {
        fechaInicio: 'DESC',
      },
    });

    // Convertir las fechas a UTC para el frontend
    return popups.map(popup => ({
      ...popup,
      fechaInicio: this.convertirPeruanoAUTC(popup.fechaInicio),
      fechaFin: this.convertirPeruanoAUTC(popup.fechaFin),
    }));
  }

  /**
   * Obtener un popup por ID
   */
  async obtenerPopupPorId(id: number): Promise<PopupProgramado> {
    const popup = await this.popupRepository.findOne({ where: { id } });

    if (!popup) {
      throw new NotFoundException(`Popup con ID ${id} no encontrado`);
    }

    // Convertir fechas a UTC
    return {
      ...popup,
      fechaInicio: this.convertirPeruanoAUTC(popup.fechaInicio),
      fechaFin: this.convertirPeruanoAUTC(popup.fechaFin),
    };
  }

  /**
   * Crear nuevo popup programado
   */
  async crearPopup(
    crearPopupDto: CrearPopupDto,
    file: Express.Multer.File,
    userId: number,
  ): Promise<PopupProgramado> {
    if (!file) {
      throw new BadRequestException('Se requiere una imagen');
    }

    // Convertir las fechas del frontend (UTC) a hora peruana para guardar
    const fechaInicioPeruano = this.convertirUTCaPeruano(new Date(crearPopupDto.fechaInicio));
    const fechaFinPeruano = this.convertirUTCaPeruano(new Date(crearPopupDto.fechaFin));

    if (fechaInicioPeruano >= fechaFinPeruano) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    const popup = this.popupRepository.create({
      titulo: crearPopupDto.titulo,
      imagenUrl: file.filename,
      fechaInicio: fechaInicioPeruano,
      fechaFin: fechaFinPeruano,
      activo: crearPopupDto.activo !== undefined ? crearPopupDto.activo : true,
      mensajeWhatsapp: crearPopupDto.mensajeWhatsapp || null,
      userIdCrea: userId,
      userIdActua: userId,
    });

    const savedPopup = await this.popupRepository.save(popup);

    // Devolver con fechas en UTC
    return {
      ...savedPopup,
      fechaInicio: this.convertirPeruanoAUTC(savedPopup.fechaInicio),
      fechaFin: this.convertirPeruanoAUTC(savedPopup.fechaFin),
    };
  }

  /**
   * Actualizar popup existente
   */
  async actualizarPopup(
    id: number,
    actualizarPopupDto: ActualizarPopupDto,
    file: Express.Multer.File | null,
    userId: number,
  ): Promise<PopupProgramado> {
    const popup = await this.popupRepository.findOne({ where: { id } });
    
    if (!popup) {
      throw new NotFoundException(`Popup con ID ${id} no encontrado`);
    }

    // Si hay nueva imagen, eliminar la anterior
    if (file) {
      if (popup.imagenUrl) {
        this.eliminarArchivoFisico(popup.imagenUrl);
      }
      popup.imagenUrl = file.filename;
    }

    // Actualizar campos
    if (actualizarPopupDto.titulo) {
      popup.titulo = actualizarPopupDto.titulo;
    }

    if (actualizarPopupDto.fechaInicio) {
      popup.fechaInicio = this.convertirUTCaPeruano(new Date(actualizarPopupDto.fechaInicio));
    }

    if (actualizarPopupDto.fechaFin) {
      popup.fechaFin = this.convertirUTCaPeruano(new Date(actualizarPopupDto.fechaFin));
    }

    if (actualizarPopupDto.activo !== undefined) {
      popup.activo = actualizarPopupDto.activo;
    }
    if (actualizarPopupDto.mensajeWhatsapp!== undefined) {
      popup.mensajeWhatsapp = actualizarPopupDto.mensajeWhatsapp;
    }

    // Validar fechas
    if (popup.fechaInicio >= popup.fechaFin) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    popup.userIdActua = userId;

    const savedPopup = await this.popupRepository.save(popup);

    // Devolver con fechas en UTC
    return {
      ...savedPopup,
      fechaInicio: this.convertirPeruanoAUTC(savedPopup.fechaInicio),
      fechaFin: this.convertirPeruanoAUTC(savedPopup.fechaFin),
    };
  }

  /**
   * Eliminar popup
   */
  async eliminarPopup(id: number): Promise<void> {
    const popup = await this.popupRepository.findOne({ where: { id } });

    if (!popup) {
      throw new NotFoundException(`Popup con ID ${id} no encontrado`);
    }

    // Eliminar imagen del servidor
    if (popup.imagenUrl) {
      this.eliminarArchivoFisico(popup.imagenUrl);
    }

    await this.popupRepository.remove(popup);
  }

  /**
   * Activar/Desactivar popup
   */
  async toggleActivo(id: number, activo: boolean, userId: number): Promise<PopupProgramado> {
    const popup = await this.popupRepository.findOne({ where: { id } });

    if (!popup) {
      throw new NotFoundException(`Popup con ID ${id} no encontrado`);
    }

    popup.activo = activo;
    popup.userIdActua = userId;

    const savedPopup = await this.popupRepository.save(popup);

    // Devolver con fechas en UTC
    return {
      ...savedPopup,
      fechaInicio: this.convertirPeruanoAUTC(savedPopup.fechaInicio),
      fechaFin: this.convertirPeruanoAUTC(savedPopup.fechaFin),
    };
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