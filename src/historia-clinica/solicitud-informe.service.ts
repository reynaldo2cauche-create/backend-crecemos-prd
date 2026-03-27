import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SolicitudInforme } from './entities/solicitud-informe.entity';
import { ModalidadPago } from './entities/modalidad-pago.entity';
import { EstadoPago } from './entities/estado-pago.entity';
import { CreateSolicitudInformeDto } from './dto/create-solicitud-informe.dto';
import { UpdateSolicitudInformeDto } from './dto/update-solicitud-informe.dto';

@Injectable()
export class SolicitudInformeService {
  constructor(
    @InjectRepository(SolicitudInforme)
    private readonly solicitudInformeRepo: Repository<SolicitudInforme>,
    @InjectRepository(ModalidadPago)
    private readonly modalidadPagoRepo: Repository<ModalidadPago>,
    @InjectRepository(EstadoPago)
    private readonly estadoPagoRepo: Repository<EstadoPago>,
  ) {}

  // =============== SOLICITUDES DE INFORME ===============

  async create(dto: CreateSolicitudInformeDto): Promise<SolicitudInforme> {
    try {
      console.log('📝 [CREATE] Creando solicitud de informe:', dto);

      const solicitud = this.solicitudInformeRepo.create(dto);
      const resultado = await this.solicitudInformeRepo.save(solicitud);

      console.log('✅ [CREATE] Solicitud creada con ID:', resultado.id);
      return resultado;
    } catch (error) {
      console.error('❌ [CREATE] Error al crear solicitud:', error);
      throw new BadRequestException('Error al crear la solicitud de informe');
    }
  }

  async findAll(): Promise<SolicitudInforme[]> {
    return await this.solicitudInformeRepo.find({
      order: { fecha_solicitud: 'DESC' },
    });
  }

  async findOne(id: number): Promise<SolicitudInforme> {
    const solicitud = await this.solicitudInformeRepo.findOne({
      where: { id },
      relations: ['venta_servicio', 'venta_servicio.paciente'],
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud de informe con ID ${id} no encontrada`);
    }

    return solicitud;
  }

  async findByPaciente(pacienteId: number): Promise<SolicitudInforme[]> {
    return await this.solicitudInformeRepo
      .createQueryBuilder('si')
      .leftJoinAndSelect('si.servicio', 'servicio')
      .leftJoinAndSelect('si.tipo_archivo', 'tipo_archivo')
      .leftJoinAndSelect('si.especialista', 'especialista')
      .leftJoinAndSelect('si.modalidad_pago', 'modalidad_pago')
      .leftJoinAndSelect('si.estado_pago', 'estado_pago')
      .leftJoinAndSelect('si.venta_servicio', 'venta_servicio')
      .leftJoinAndSelect('venta_servicio.paciente', 'paciente')
      .where('paciente.id = :pacienteId', { pacienteId })
      .orderBy('si.fecha_solicitud', 'DESC')
      .getMany();
  }

  async findByEspecialista(especialistaId: number): Promise<SolicitudInforme[]> {
    return await this.solicitudInformeRepo.find({
      where: { especialista_id: especialistaId },
      order: { fecha_solicitud: 'DESC' },
    });
  }

  async update(id: number, dto: UpdateSolicitudInformeDto): Promise<SolicitudInforme> {
    const solicitud = await this.findOne(id);

    const solicitudActualizada = this.solicitudInformeRepo.merge(solicitud, dto);
    return await this.solicitudInformeRepo.save(solicitudActualizada);
  }

  async remove(id: number): Promise<void> {
    const solicitud = await this.findOne(id);
    await this.solicitudInformeRepo.remove(solicitud);
  }

  // =============== MODALIDADES DE PAGO ===============

  async findAllModalidadesPago(): Promise<ModalidadPago[]> {
    return await this.modalidadPagoRepo.find();
  }

  // =============== ESTADOS DE PAGO ===============

  async findAllEstadosPago(): Promise<EstadoPago[]> {
    return await this.estadoPagoRepo.find();
  }
}
