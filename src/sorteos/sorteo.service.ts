import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, Not, IsNull, DataSource } from 'typeorm';
import { Sorteo } from './entities/sorteo.entity';

import { SorteoGanador } from './entities/sorteo-ganador.entity';
import { EstadoSorteo } from './entities/estado-sorteo.entity';
import { SorteoParticipante } from './entities/sorteo-participante.entity';

import { Paciente } from '../pacientes/paciente.entity';
import { TipoCompra } from './entities/tipo-compra.entity';
import { Paquete } from './entities/paquete.entity';
import { CrearSorteoDto, RealizarSorteoDto } from './dto/crear-sorteo.dto';
import { CrearSorteoManualDto, AgregarParticipanteDto, AgregarMultiplesParticipantesDto, FinalizarSorteoManualDto, GanadorDto } from './dto/sorteo-manual.dto';
import * as PDFDocument from 'pdfkit';
import { PacienteElegibleDto } from './dto/paciente-elegible.dto';

interface PacienteElegible {
  id: number;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  numero_documento: string;
  celular: string;
  correo: string;
  opciones: number; // Cuántas veces entra en el sorteo
}

@Injectable()
export class SorteoService {
  constructor(
    @InjectRepository(Sorteo)
    private sorteoRepository: Repository<Sorteo>,

    @InjectRepository(SorteoGanador)
    private ganadorRepository: Repository<SorteoGanador>,
    @InjectRepository(EstadoSorteo)
    private estadoSorteoRepository: Repository<EstadoSorteo>,
    @InjectRepository(SorteoParticipante)
    private participanteRepository: Repository<SorteoParticipante>,

    @InjectRepository(Paciente)
    private pacienteRepository: Repository<Paciente>,
    @InjectRepository(TipoCompra)
    private tipoCompraRepository: Repository<TipoCompra>,
    @InjectRepository(Paquete)
    private paqueteRepository: Repository<Paquete>,
    private dataSource: DataSource,
  ) {}

  /**
   * 🎯 Obtiene pacientes elegibles según las reglas del sorteo
   *
   * Lógica de negocio:
   * 1. Pagó dentro del mes del evento → PARTICIPA
   * 2. Pagó fin de mes anterior + usa sesiones en mes del evento → PARTICIPA
   * 3. Individual: Se agrupa a 1 entrada por paciente por mes
   * 4. Paquetes: Según opciones_por_unidad en reglas_sorteo
   */
  // async obtenerPacientesElegibles(sorteoId: number): Promise<PacienteElegibleDto[]> {
  //   const sorteo = await this.sorteoRepository.findOne({
  //     where: { id: sorteoId },
  //     relations: ['reglas', 'reglas.tipoCompra', 'reglas.paquete'],
  //   });

  //   if (!sorteo) {
  //     throw new NotFoundException(`Sorteo con ID ${sorteoId} no encontrado`);
  //   }

  //   if (!sorteo.reglas || sorteo.reglas.length === 0) {
  //     throw new BadRequestException('El sorteo no tiene reglas configuradas');
  //   }

  //   const ganadoresPrevios = await this.ganadorRepository.find({
  //     select: ['pacienteId'],
  //   });
  //   const idsExcluidos = ganadoresPrevios.map(g => g.pacienteId);

  //   const fechaInicio = new Date(sorteo.fechaInicio);
  //   const fechaFin = new Date(sorteo.fechaFin);

  //   const mesAnterior = new Date(fechaInicio);
  //   mesAnterior.setMonth(mesAnterior.getMonth() - 1);
  //   const ultimoDiaMesAnterior = new Date(mesAnterior.getFullYear(), mesAnterior.getMonth() + 1, 0);

  //   console.log(`📅 Rango de elegibilidad: ${ultimoDiaMesAnterior.toISOString().split('T')[0]} - ${fechaFin.toISOString().split('T')[0]}`);

  //   const pacientesMap = new Map<number, PacienteElegibleDto>();

  //   for (const regla of sorteo.reglas) {
  //     console.log(`🔍 Procesando regla: ${regla.tipoCompra.nombre} - ${regla.paquete?.nombre || 'Todos'}`);

  //     const queryBuilder = this.compraRepository
  //       .createQueryBuilder('compra')
  //       .leftJoinAndSelect('compra.paciente', 'paciente')
  //       .leftJoinAndSelect('compra.tipoCompra', 'tipoCompra')
  //       .leftJoinAndSelect('compra.paquete', 'paquete')
  //       .where('compra.tipoCompraId = :tipoCompraId', { tipoCompraId: regla.tipoCompraId })
  //       .andWhere('compra.fechaCompra BETWEEN :inicio AND :fin', {
  //         inicio: ultimoDiaMesAnterior.toISOString().split('T')[0],
  //         fin: fechaFin.toISOString().split('T')[0],
  //       })
  //       .andWhere('paciente.estado_paciente_id != :estadoInactivo', { estadoInactivo: 5 })
  //       .andWhere('paciente.mostrar_en_listado = :visible', { visible: true });

  //     if (regla.paqueteId) {
  //       queryBuilder.andWhere('compra.paqueteId = :paqueteId', { paqueteId: regla.paqueteId });
  //     }

  //     if (idsExcluidos.length > 0) {
  //       queryBuilder.andWhere('paciente.id NOT IN (:...idsExcluidos)', { idsExcluidos });
  //     }

  //     const comprasElegibles = await queryBuilder.getMany();

  //     console.log(`✅ Compras elegibles encontradas: ${comprasElegibles.length}`);

  //     for (const compra of comprasElegibles) {
  //       const paciente = compra.paciente;
  //       const key = paciente.id;

  //       if (!pacientesMap.has(key)) {
  //         pacientesMap.set(key, {
  //           id: paciente.id,
  //           nombres: paciente.nombres,
  //           apellido_paterno: paciente.apellido_paterno,
  //           apellido_materno: paciente.apellido_materno,
  //           numero_documento: paciente.numero_documento,
  //           celular: paciente.celular,
  //           correo: paciente.correo,
  //           opciones: 0,
  //         });
  //       }

  //       const pacienteElegible = pacientesMap.get(key);

  //       if (regla.tipoCompra.nombre === 'INDIVIDUAL') {
  //         if (pacienteElegible.opciones === 0) {
  //           pacienteElegible.opciones = regla.opcionesPorUnidad;
  //         }
  //       } else {
  //         pacienteElegible.opciones += regla.opcionesPorUnidad * compra.cantidad;
  //       }
  //     }
  //   }

  //   const pacientesElegibles = Array.from(pacientesMap.values());

  //   console.log(`🎯 Total pacientes elegibles: ${pacientesElegibles.length}`);
  //   console.log(`📊 Total opciones en sorteo: ${pacientesElegibles.reduce((sum, p) => sum + p.opciones, 0)}`);

  //   return pacientesElegibles;
  // }

  /**
   * Calcula pacientes elegibles a partir de reglas y fechas, SIN guardar nada en BD.
   * @param dto Objeto con fecha_inicio, fecha_fin y reglas
   * @returns Array de pacientes elegibles con sus opciones
   */
  // async calcularPacientesElegibles(dto: {
  //   fecha_inicio: string;
  //   fecha_fin: string;
  //   reglas: Array<{
  //     tipo_compra_id: number;
  //     paquete_id?: number;
  //     opciones_por_unidad: number;
  //   }>;
  // }): Promise<PacienteElegibleDto[]> {
  //   const { fecha_inicio, fecha_fin, reglas } = dto;

  //   if (!reglas || reglas.length === 0) {
  //     throw new BadRequestException('Debe enviar al menos una regla');
  //   }

  //   const fechaInicio = new Date(fecha_inicio);
  //   const fechaFin = new Date(fecha_fin);

  //   const inicioPeriodo = fechaInicio;
  //   const finPeriodo = fechaFin;

  //   // Excluir pacientes que ya han ganado antes (para evitar que ganen otra vez)
  //   const ganadoresPrevios = await this.ganadorRepository.find({ select: ['pacienteId'] });
  //   const idsExcluidos = ganadoresPrevios.map(g => g.pacienteId);

  //   const pacientesMap = new Map<number, PacienteElegibleDto>();

  //   for (const regla of reglas) {
  //     const tipoCompra = await this.tipoCompraRepository.findOne({
  //       where: { id: regla.tipo_compra_id }
  //     });
  //     if (!tipoCompra) continue;

  //     const queryBuilder = this.compraRepository
  //       .createQueryBuilder('compra')
  //       .leftJoinAndSelect('compra.paciente', 'paciente')
  //       .leftJoinAndSelect('compra.tipoCompra', 'tipoCompra')
  //       .leftJoinAndSelect('compra.paquete', 'paquete')
  //       .where('compra.tipoCompraId = :tipoCompraId', { tipoCompraId: regla.tipo_compra_id })
  //       .andWhere('compra.fechaCompra BETWEEN :inicio AND :fin', {
  //         inicio: inicioPeriodo.toISOString().split('T')[0],
  //         fin: finPeriodo.toISOString().split('T')[0],
  //       })
  //       .andWhere('paciente.estado_paciente_id != :estadoInactivo', { estadoInactivo: 5 })
  //       .andWhere('paciente.mostrar_en_listado = :visible', { visible: true });

  //     if (regla.paquete_id) {
  //       queryBuilder.andWhere('compra.paqueteId = :paqueteId', { paqueteId: regla.paquete_id });
  //     }

  //     if (idsExcluidos.length > 0) {
  //       queryBuilder.andWhere('paciente.id NOT IN (:...idsExcluidos)', { idsExcluidos });
  //     }

  //     const comprasElegibles = await queryBuilder.getMany();

  //     for (const compra of comprasElegibles) {
  //       const paciente = compra.paciente;
  //       const key = paciente.id;

  //       if (!pacientesMap.has(key)) {
  //         pacientesMap.set(key, {
  //           id: paciente.id,
  //           nombres: paciente.nombres,
  //           apellido_paterno: paciente.apellido_paterno,
  //           apellido_materno: paciente.apellido_materno,
  //           numero_documento: paciente.numero_documento,
  //           celular: paciente.celular,
  //           correo: paciente.correo,
  //           opciones: 0,
  //         });
  //       }

  //       const pacienteElegible = pacientesMap.get(key);

  //       if (tipoCompra.nombre === 'INDIVIDUAL') {
  //         // Para individual, solo se asigna opciones una vez por paciente (no se suman)
  //         if (pacienteElegible.opciones === 0) {
  //           pacienteElegible.opciones = regla.opciones_por_unidad;
  //         }
  //       } else {
  //         // Para paquetes, se multiplica por la cantidad de paquetes comprados
  //         pacienteElegible.opciones += regla.opciones_por_unidad * compra.cantidad;
  //       }

  //       console.log('================================='); 
  //       console.log('📅 Fecha inicio del sorteo:', fecha_inicio);
  //       console.log('📅 Fecha fin del sorteo:', fecha_fin);
        
  //       console.log('🔍 Reglas recibidas:', JSON.stringify(reglas, null, 2));
  //       console.log('🚫 IDs excluidos (ganadores previos):', idsExcluidos);
  //       console.log('=================================');
  //     }
  //   }

  //   console.log('📊 Pacientes elegibles encontrados:');
  //   pacientesMap.forEach((p, id) => {
  //     console.log(`   - ID: ${id}, Nombre: ${p.nombres} ${p.apellido_paterno}, Opciones: ${p.opciones}`);
  //   });

  //   return Array.from(pacientesMap.values());
  // }

  /**
   * 📝 Crear un sorteo (CON o SIN reglas)
   * Para sorteos manuales, las reglas son opcionales
   */
  async crearSorteo(dto: CrearSorteoDto, userId?: number) {
    // Crear el sorteo
    const sorteo = this.sorteoRepository.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion || '',
      fechaInicio: new Date(dto.fecha_inicio),
      fechaFin: new Date(dto.fecha_fin),
      fechaSorteo: new Date(dto.fecha_sorteo),
      cantidadGanadores: dto.cantidad_ganadores,
      userCreaId: userId || null, // ✅ Usuario que crea el sorteo
      userActuaId: userId || null, // ✅ Usuario que actualiza (mismo al crear)
    });

    const sorteoGuardado = await this.sorteoRepository.save(sorteo);


    // Retornar sorteo con reglas (si las tiene)
    return this.sorteoRepository.findOne({
      where: { id: sorteoGuardado.id },
      relations: ['reglas', 'reglas.tipoCompra', 'reglas.paquete'],
    });
  }

  /**
   * 🎲 Realizar sorteo (guardar ganadores)
   * Acepta sorteos con o sin reglas (manual o automático)
   */
  async realizarSorteo(dto: RealizarSorteoDto, userId?: number) {
    // Primero crear el sorteo (con o sin reglas)
    const sorteo = await this.crearSorteo(dto, userId);

    // Validar que todos los pacientes existan
    const pacienteIds = dto.ganadores.map(g => g.paciente_id);
    const pacientes = await this.pacienteRepository.findBy({
      id: In(pacienteIds),
    });

    if (pacientes.length !== pacienteIds.length) {
      throw new BadRequestException('Uno o más pacientes no existen');
    }

    // Crear ganadores
    const ganadores = dto.ganadores.map(g =>
      this.ganadorRepository.create({
        sorteoId: sorteo.id,
        pacienteId: g.paciente_id,
        posicion: g.posicion,
      }),
    );

    await this.ganadorRepository.save(ganadores);

    console.log(`🎉 Sorteo realizado por usuario ${userId}: ${ganadores.length} ganadores guardados`);

    // Retornar sorteo completo
    return this.sorteoRepository.findOne({
      where: { id: sorteo.id },
      relations: ['reglas', 'reglas.tipoCompra', 'reglas.paquete', 'ganadores', 'ganadores.paciente'],
    });
  }

  /**
   * 📚 Obtener historial de sorteos
   */
  async obtenerHistorial(page = 1, limit = 10) {
    const [sorteos, total] = await this.sorteoRepository.findAndCount({
      relations: ['ganadores', 'reglas', 'userCrea'],
      order: { fechaSorteo: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: sorteos.map(s => ({
        id: s.id,
        nombre: s.nombre,
        descripcion: s.descripcion,
        fecha_inicio: s.fechaInicio,
        fecha_fin: s.fechaFin,
        fecha_sorteo: s.fechaSorteo,
        cantidad_ganadores: s.cantidadGanadores,
        total_ganadores_registrados: s.ganadores?.length || 0,
      
        registrado_por: s.userCrea ? `${s.userCrea.nombres} ${s.userCrea.apellidos}` : 'Sistema',
        created_at: s.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 🔍 Obtener detalle de un sorteo
   */
  async obtenerDetalle(id: number) {
    const sorteo = await this.sorteoRepository.findOne({
      where: { id },
      relations: [
        'ganadores',
        'ganadores.paciente',
        'reglas',
        'reglas.tipoCompra',
        'reglas.paquete',
        'userCrea',
        'estadoSorteo',
      ],
    });

    if (!sorteo) {
      throw new NotFoundException(`Sorteo con ID ${id} no encontrado`);
    }

    return {
      id: sorteo.id,
      nombre: sorteo.nombre,
      descripcion: sorteo.descripcion,
      fecha_inicio: sorteo.fechaInicio,
      fecha_fin: sorteo.fechaFin,
      fecha_sorteo: sorteo.fechaSorteo,
      cantidad_ganadores: sorteo.cantidadGanadores,
      estado: sorteo.estadoSorteo?.nombre || 'desconocido',
     
      registrado_por: sorteo.userCrea ? `${sorteo.userCrea.nombres} ${sorteo.userCrea.apellidos}` : 'Sistema',
      created_at: sorteo.createdAt,
 
      ganadores: sorteo.ganadores
        ?.map(g => ({
          id: g.id,
          posicion: g.posicion,
          paciente_id: g.pacienteId,
          nombres: g.paciente?.nombres,
          apellido_paterno: g.paciente?.apellido_paterno,
          apellido_materno: g.paciente?.apellido_materno,
          numero_documento: g.paciente?.numero_documento,
          celular: g.paciente?.celular,
          correo: g.paciente?.correo,
          created_at: g.createdAt,
        }))
        .sort((a, b) => a.posicion - b.posicion) || [],
    };
  }

  /**
   * 🗑️ Eliminar un sorteo
   */
  async eliminar(id: number) {
    const sorteo = await this.sorteoRepository.findOne({ where: { id } });

    if (!sorteo) {
      throw new NotFoundException(`Sorteo con ID ${id} no encontrado`);
    }

    await this.sorteoRepository.remove(sorteo);
    return { message: 'Sorteo eliminado exitosamente' };
  }

  /**
   * 📄 Generar PDF de resultados - FORMATO FORMAL
   */
  async generarPDF(id: number): Promise<Buffer> {
    const sorteo = await this.obtenerDetalle(id);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ 
        margin: 60,
        size: 'A4',
      });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ========== ENCABEZADO FORMAL ==========
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .fillColor('#1a1a1a')
        .text('Crecemos - Centro Integral de Terapias', { align: 'center' })
        .moveDown(0.5);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#666666')
        .text('RUC: 20601074380', { align: 'center' })
        .moveDown(2);

      // Línea divisoria
      doc
        .moveTo(60, doc.y)
        .lineTo(535, doc.y)
        .strokeColor('#cccccc')
        .lineWidth(1)
        .stroke()
        .moveDown(1.5);

      // ========== TÍTULO DEL DOCUMENTO ==========
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .fillColor('#1a1a1a')
        .text('ACTA DE SORTEO', { align: 'center' })
        .moveDown(0.5);

      doc
        .fontSize(11)
        .font('Helvetica')
        .fillColor('#666666')
        .text(`Sorteo: ${sorteo.nombre}`, { align: 'center' })
        .moveDown(2);

      // ========== INFORMACIÓN DEL SORTEO ==========
      const fechaSorteoFormateada = new Date(sorteo.fecha_sorteo).toLocaleDateString('es-PE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const horaFormateada = new Date(sorteo.fecha_sorteo).toLocaleTimeString('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
      });

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#333333')
        .text('DATOS DEL SORTEO', { underline: true })
        .moveDown(0.5);

      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#1a1a1a');

      const infoY = doc.y;
      doc.text(`Fecha del Sorteo:`, 60, infoY);
      doc.text(`${fechaSorteoFormateada}`, 200, infoY);

      doc.text(`Hora:`, 60, doc.y);
      doc.text(`${horaFormateada}`, 200, doc.y);

      if (sorteo.descripcion) {
        doc.text(`Descripción:`, 60, doc.y);
        doc.text(`${sorteo.descripcion}`, 200, doc.y);
      }

      doc.text(`Total de Ganadores:`, 60, doc.y);
      doc.text(`${sorteo.cantidad_ganadores}`, 200, doc.y);

      doc.text(`Registrado por:`, 60, doc.y);
      doc.text(`${sorteo.registrado_por}`, 200, doc.y);

      doc.moveDown(2);

      // ========== LISTA DE GANADORES ==========
      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#333333')
        .text('GANADORES DEL SORTEO', { underline: true })
        .moveDown(1);

      // Tabla de ganadores
      sorteo.ganadores.forEach((ganador, index) => {
        const nombreCompleto = `${ganador.nombres} ${ganador.apellido_paterno} ${ganador.apellido_materno || ''}`.trim();

        // Fondo alternado para cada fila
        if (index % 2 === 0) {
          doc
            .rect(60, doc.y - 5, 475, 50)
            .fillColor('#f8f8f8')
            .fill();
        }

        const startY = doc.y;

        // Número de posición
        doc
          .fontSize(16)
          .font('Helvetica-Bold')
          .fillColor('#1a1a1a')
          .text(`${ganador.posicion}°`, 70, startY);

        // Información del ganador
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#1a1a1a')
          .text(nombreCompleto, 110, startY, { width: 350 });

        doc
          .fontSize(9)
          .font('Helvetica')
          .fillColor('#666666')
          .text(`DNI: ${ganador.numero_documento}`, 110, startY + 15);

        if (ganador.celular) {
          doc.text(`Tel: ${ganador.celular}`, 110, startY + 27);
        }

        doc.moveDown(3);
      });

      doc.moveDown(2);

      // ========== FIRMAS ==========
      doc
        .moveTo(60, doc.y)
        .lineTo(535, doc.y)
        .strokeColor('#cccccc')
        .lineWidth(1)
        .stroke()
        .moveDown(3);

      const firmaY = doc.y;

      // Firma izquierda - Usuario que registró
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#666666')
        .text('_________________________________', 80, firmaY, { width: 200, align: 'center' });

      doc.text('Registrado por', 80, firmaY + 20, { width: 200, align: 'center' });
      doc
        .font('Helvetica-Bold')
        .fillColor('#1a1a1a')
        .text(sorteo.registrado_por, 80, firmaY + 35, { width: 200, align: 'center' });

      // Firma derecha
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#666666')
        .text('_________________________________', 315, firmaY, { width: 200, align: 'center' });
      
      doc.text('Director(a) General', 315, firmaY + 20, { width: 200, align: 'center' });

      // ========== PIE DE PÁGINA ==========
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#999999')
          .text(
            `Documento generado el ${new Date().toLocaleDateString('es-PE')} a las ${new Date().toLocaleTimeString('es-PE')}`,
            60,
            doc.page.height - 50,
            { align: 'center', width: 475 }
          );
        
        doc.text(
          `Página ${i + 1} de ${pageCount}`,
          60,
          doc.page.height - 35,
          { align: 'center', width: 475 }
        );
      }

      doc.end();
    });
  }

  /**
   * 📦 Obtener todos los paquetes activos
   */
  async obtenerPaquetes() {
    return this.paqueteRepository.find({
      where: { flgActivo: true },
      order: { cantidadSesiones: 'ASC' },
    });
  }

  /**
   * 📋 Obtener todos los tipos de compra
   */
  async obtenerTiposCompra() {
    return this.tipoCompraRepository.find({
      where: { flgActivo: true },
      order: { nombre: 'ASC' },
    });
  }

  // ========== MÉTODOS PARA SORTEOS MANUALES ==========

  /**
   * 🎯 Crear un sorteo MANUAL (estado: preparación)
   * Sin reglas, sin fechas obligatorias
   */
  async crearSorteoManual(dto: CrearSorteoManualDto, userId?: number) {
    const estadoPreparacion = await this.estadoSorteoRepository.findOne({
      where: { nombre: 'preparacion' }
    });

    if (!estadoPreparacion) {
      throw new NotFoundException('Estado "preparacion" no encontrado en la BD');
    }

    const sorteo = this.sorteoRepository.create({
      nombre: dto.nombre,
      descripcion: dto.descripcion || '',
      estadoSorteoId: estadoPreparacion.id,
      userCreaId: userId || null,
      userActuaId: userId || null,
    });

    const sorteoGuardado = await this.sorteoRepository.save(sorteo);

    console.log(`✅ Sorteo MANUAL creado (ID: ${sorteoGuardado.id}) por usuario ${userId}`);

    return sorteoGuardado;
  }

  /**
   * ➕ Agregar un participante a un sorteo manual
   * PERMITE DUPLICADOS - Un paciente puede estar múltiples veces
   */
  async agregarParticipante(sorteoId: number, dto: AgregarParticipanteDto) {
    // Validar que el sorteo existe y está en preparación
    const sorteo = await this.sorteoRepository.findOne({
      where: { id: sorteoId },
      relations: ['estadoSorteo'],
    });

    if (!sorteo) {
      throw new NotFoundException(`Sorteo con ID ${sorteoId} no encontrado`);
    }

    if (sorteo.estadoSorteo?.nombre !== 'preparacion') {
      throw new BadRequestException('No se pueden agregar participantes a un sorteo finalizado');
    }

    // Validar que el paciente existe
    const paciente = await this.pacienteRepository.findOne({
      where: { id: dto.paciente_id }
    });

    if (!paciente) {
      throw new NotFoundException(`Paciente con ID ${dto.paciente_id} no encontrado`);
    }

    // ✅ NO VALIDAMOS DUPLICADOS - Se permite agregar el mismo paciente múltiples veces

    // Crear participante
    const participante = this.participanteRepository.create({
      sorteoId,
      pacienteId: dto.paciente_id,
    });

    await this.participanteRepository.save(participante);

    // Contar cuántas veces está este paciente
    const vecesEnSorteo = await this.participanteRepository.count({
      where: { sorteoId, pacienteId: dto.paciente_id }
    });

    console.log(`➕ Participante ${dto.paciente_id} agregado al sorteo ${sorteoId} (${vecesEnSorteo}x)`);

    return {
      message: 'Participante agregado exitosamente',
      participante,
      veces: vecesEnSorteo
    };
  }

  /**
   * ➕ Agregar múltiples participantes a un sorteo manual
   * PERMITE DUPLICADOS - Se puede agregar el mismo paciente varias veces
   */
  async agregarMultiplesParticipantes(sorteoId: number, dto: AgregarMultiplesParticipantesDto) {
    // Validar que el sorteo existe y está en preparación
    const sorteo = await this.sorteoRepository.findOne({
      where: { id: sorteoId },
      relations: ['estadoSorteo'],
    });

    if (!sorteo) {
      throw new NotFoundException(`Sorteo con ID ${sorteoId} no encontrado`);
    }

    if (sorteo.estadoSorteo?.nombre !== 'preparacion') {
      throw new BadRequestException('No se pueden agregar participantes a un sorteo finalizado');
    }

    // Validar que todos los pacientes existen
    const pacientes = await this.pacienteRepository.findBy({
      id: In(dto.pacientes_ids)
    });

    if (pacientes.length !== dto.pacientes_ids.length) {
      throw new BadRequestException('Uno o más pacientes no existen');
    }

    // ✅ NO VALIDAMOS DUPLICADOS - Crear participantes directamente
    const participantes = dto.pacientes_ids.map(id =>
      this.participanteRepository.create({
        sorteoId,
        pacienteId: id,
      })
    );

    await this.participanteRepository.save(participantes);

    console.log(`➕ ${participantes.length} participantes agregados al sorteo ${sorteoId}`);

    return {
      message: `${participantes.length} participante(s) agregado(s) exitosamente`,
      agregados: participantes.length,
    };
  }

  /**
   * ➖ Eliminar UNA entrada de un participante de un sorteo manual
   * Ahora recibe el ID de la entrada específica (no el paciente_id)
   */
  async eliminarParticipante(sorteoId: number, entradaId: number) {
    // Validar que el sorteo está en preparación
    const sorteo = await this.sorteoRepository.findOne({
      where: { id: sorteoId },
      relations: ['estadoSorteo'],
    });

    if (!sorteo) {
      throw new NotFoundException(`Sorteo con ID ${sorteoId} no encontrado`);
    }

    if (sorteo.estadoSorteo?.nombre !== 'preparacion') {
      throw new BadRequestException('No se pueden eliminar participantes de un sorteo finalizado');
    }

    // Buscar la entrada específica por su ID
    const participante = await this.participanteRepository.findOne({
      where: { id: entradaId, sorteoId }
    });

    if (!participante) {
      throw new NotFoundException('La entrada no fue encontrada en este sorteo');
    }

    await this.participanteRepository.remove(participante);

    console.log(`➖ Entrada ${entradaId} (paciente ${participante.pacienteId}) eliminada del sorteo ${sorteoId}`);

    return { message: 'Entrada eliminada exitosamente' };
  }

  /**
   * 📋 Obtener participantes de un sorteo manual
   * Devuelve TODAS las entradas (con duplicados)
   */
  async obtenerParticipantes(sorteoId: number) {
    const sorteo = await this.sorteoRepository.findOne({
      where: { id: sorteoId }
    });

    if (!sorteo) {
      throw new NotFoundException(`Sorteo con ID ${sorteoId} no encontrado`);
    }

    const participantes = await this.participanteRepository.find({
      where: { sorteoId },
      relations: ['paciente'],
      order: { fechaRegistro: 'ASC' },
    });

    // Retornar TODAS las entradas (con duplicados)
    return participantes.map(p => ({
      id: p.id,
      paciente_id: p.pacienteId,
      nombres: p.paciente?.nombres,
      apellido_paterno: p.paciente?.apellido_paterno,
      apellido_materno: p.paciente?.apellido_materno,
      numero_documento: p.paciente?.numero_documento,
      celular: p.paciente?.celular,
      correo: p.paciente?.correo,
      fecha_registro: p.fechaRegistro,
    }));
  }

  /**
   * 📚 Obtener sorteos manuales (preparación + finalizados)
   */
  async obtenerSorteosEnPreparacion() {
    // Obtener todos los sorteos manuales (tipo_sorteo_id = null o que tengan participantes manuales)
    const sorteos = await this.sorteoRepository.find({
      relations: ['userCrea', 'estadoSorteo', 'ganadores', 'ganadores.paciente'],
      order: { createdAt: 'DESC' },
      where: [
        { estadoSorteoId: Not(IsNull()) } // Sorteos con estado (manuales)
      ]
    });

    // Obtener cantidad de participantes y ganadores por sorteo
    const sorteosConDatos = await Promise.all(
      sorteos.map(async (sorteo) => {
        const participantes = await this.participanteRepository.count({
          where: { sorteoId: sorteo.id }
        });

        const ganadores = sorteo.ganadores || [];

        return {
          id: sorteo.id,
          nombre: sorteo.nombre,
          descripcion: sorteo.descripcion,
          cantidad_participantes: participantes,
          cantidad_ganadores: ganadores.length,
          estado: sorteo.estadoSorteo?.nombre || 'desconocido',
          fecha_sorteo: sorteo.fechaSorteo,
          registrado_por: sorteo.userCrea ? `${sorteo.userCrea.nombres} ${sorteo.userCrea.apellidos}` : 'Sistema',
          created_at: sorteo.createdAt,
        };
      })
    );

    return sorteosConDatos;
  }

  /**
   * 🎉 Finalizar sorteo manual (guardar ganadores)
   */
  async finalizarSorteoManual(sorteoId: number, dto: FinalizarSorteoManualDto, userId?: number) {
    console.log('📥 BACKEND - Recibiendo datos:', {
      sorteoId,
      ganadores: dto.ganadores,
      userId
    });

    // Crear una transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validar sorteo dentro de la transacción
      const sorteo = await queryRunner.manager.findOne(Sorteo, {
        where: { id: sorteoId },
        relations: ['estadoSorteo'],
      });

      if (!sorteo) {
        throw new NotFoundException(`Sorteo con ID ${sorteoId} no encontrado`);
      }

      console.log('🔍 Estado actual:', sorteo.estadoSorteo?.nombre);

      if (sorteo.estadoSorteo?.nombre !== 'preparacion') {
        throw new BadRequestException('El sorteo ya ha sido finalizado');
      }

      // Validar participantes
      const pacienteIds = dto.ganadores.map(g => g.paciente_id);
      const participantes = await queryRunner.manager.find(SorteoParticipante, {
        where: { sorteoId, pacienteId: In(pacienteIds) }
      });

      const pacientesUnicos = [...new Set(pacienteIds)];
      const participantesUnicos = [...new Set(participantes.map(p => p.pacienteId))];
      const todosSonParticipantes = pacientesUnicos.every(id => participantesUnicos.includes(id));

      if (!todosSonParticipantes) {
        throw new BadRequestException('Uno o más ganadores no son participantes del sorteo');
      }

      // Guardar ganadores
      console.log('💾 Guardando ganadores...');
      const ganadoresEntities = dto.ganadores.map(g => {
        const ganador = new SorteoGanador();
        ganador.sorteoId = sorteoId;
        ganador.pacienteId = g.paciente_id;
        ganador.posicion = g.posicion;
        return ganador;
      });

      const ganadoresGuardados = await queryRunner.manager.save(SorteoGanador, ganadoresEntities);
      console.log('✅ Ganadores guardados:', ganadoresGuardados.length);

      // Obtener estado finalizado
      const estadoFinalizado = await queryRunner.manager.findOne(EstadoSorteo, {
        where: { nombre: 'finalizado' }
      });

      if (!estadoFinalizado) {
        throw new BadRequestException('Estado "finalizado" no encontrado en la base de datos');
      }

      console.log(`🔄 Estado encontrado:`, {
        id: estadoFinalizado.id,
        nombre: estadoFinalizado.nombre
      });

      // Usar UPDATE directo para asegurar que se guarde
      const resultUpdate = await queryRunner.manager.update(
        Sorteo,
        { id: sorteoId },
        {
          estadoSorteoId: estadoFinalizado.id,
          fechaSorteo: new Date(),
          cantidadGanadores: ganadoresGuardados.length,
          userActuaId: userId || sorteo.userActuaId,
        }
      );

      console.log('✅ Resultado del UPDATE:', resultUpdate);

      // Verificar dentro de la transacción que se guardó
      const sorteoActualizado = await queryRunner.manager.findOne(Sorteo, {
        where: { id: sorteoId },
        relations: ['estadoSorteo']
      });

      console.log('✅ Sorteo después del UPDATE (dentro de transacción):', {
        id: sorteoActualizado.id,
        estadoSorteoId: sorteoActualizado.estadoSorteoId,
        estadoNombre: sorteoActualizado.estadoSorteo?.nombre,
        cantidadGanadores: sorteoActualizado.cantidadGanadores
      });

      // Commit de la transacción
      await queryRunner.commitTransaction();
      console.log('✅ TRANSACCIÓN COMPLETADA');

      // Verificación final
      const verificacion = await this.sorteoRepository.findOne({
        where: { id: sorteoId },
        relations: ['estadoSorteo', 'ganadores']
      });
      console.log('🔍 VERIFICACIÓN FINAL:', {
        estadoNombre: verificacion.estadoSorteo?.nombre,
        cantidadGanadores: verificacion.cantidadGanadores,
        ganadoresEnBD: verificacion.ganadores?.length || 0
      });

      return this.obtenerDetalle(sorteoId);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ ERROR - Transacción revertida:', error.message);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}