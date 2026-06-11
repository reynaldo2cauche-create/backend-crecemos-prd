import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  /**
   * Envía correo de confirmación al registrar reclamo
   */
  async enviarCorreoRegistroReclamo(reclamo: any, pdfBuffer?: Buffer): Promise<void> {
    try {
      console.log('📧 Iniciando envío de correo...');
      console.log('📧 Email destino:', reclamo.email);
      console.log('📧 Código reclamo:', reclamo.codigo_reclamo);
      console.log('📧 PDF adjunto:', pdfBuffer ? 'SÍ' : 'NO');

      const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:5173');
      const consultarUrl = `${frontendUrl}/libro-reclamaciones/consultar`;

      const mailOptions: any = {
        to: reclamo.email,
        subject: `Reclamo Registrado - ${reclamo.codigo_reclamo}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7B1FA2;">Reclamo Registrado Exitosamente</h2>

            <p>Estimado/a <strong>${reclamo.nombres} ${reclamo.apellidos}</strong>,</p>

            <p>Su reclamo ha sido registrado correctamente en nuestro sistema.</p>

            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Código de Reclamo:</strong> ${reclamo.codigo_reclamo}</p>
              <p style="margin: 5px 0;"><strong>Fecha de Registro:</strong> ${new Date(reclamo.fecha_registro).toLocaleString('es-PE')}</p>
              <p style="margin: 5px 0;"><strong>Estado:</strong> ${reclamo.estado?.nombre || 'Registrado'}</p>
            </div>

            <p>Su reclamo será atendido en un plazo máximo de <strong>15 días hábiles</strong> conforme a la Ley N° 29571.</p>

            ${pdfBuffer ? '<p>Adjunto a este correo encontrará el PDF con los detalles de su reclamo.</p>' : ''}

            <h3 style="color: #7B1FA2;">Consultar Estado del Reclamo</h3>
            <p>Puede consultar el estado de su reclamo en cualquier momento ingresando a:</p>
            <p style="text-align: center;">
              <a href="${consultarUrl}" style="display: inline-block; padding: 12px 30px; background-color: #7B1FA2; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Consultar Mi Reclamo
              </a>
            </p>

            <p style="font-size: 12px; color: #666;">
              <strong>Link:</strong> <a href="${consultarUrl}">${consultarUrl}</a>
            </p>

            <p>Necesitará su <strong>código de reclamo</strong> (<code>${reclamo.codigo_reclamo}</code>) y <strong>número de documento</strong> para consultar.</p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

            <p style="font-size: 12px; color: #666; font-style: italic;">
              La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.
            </p>

            <p style="font-size: 12px; color: #999;">
              <strong>CONTIGO CRECEMOS E.I.R.L.</strong><br>
              RUC: 20601074380<br>
              Calle 48 Nro. 234, Urb. El Pinar, Comas 15316, Lima, Perú
            </p>
          </div>
        `,
      };

      // Agregar PDF adjunto si existe
      if (pdfBuffer) {
        mailOptions.attachments = [
          {
            filename: `Reclamo-${reclamo.codigo_reclamo}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ];
      }

      console.log('📧 Intentando enviar correo...');

      // Agregar timeout
      const sendPromise = this.mailerService.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout al enviar correo después de 30 segundos')), 30000);
      });

      const result = await Promise.race([sendPromise, timeoutPromise]);
      console.log('📧 Resultado del envío:', result);

      console.log(`✅ Correo de registro enviado exitosamente a: ${reclamo.email}`);
    } catch (error) {
      console.error('❌ ========================================');
      console.error('❌ ERROR AL ENVIAR CORREO DE REGISTRO');
      console.error('❌ ========================================');
      console.error('❌ Error:', error);
      console.error('❌ Mensaje:', error.message);
      console.error('❌ Código de error:', error.code);
      console.error('❌ Stack:', error.stack);
      console.error('❌ ========================================');
      // No lanzamos el error para que no falle el registro del reclamo
    }
  }

  /**
   * Envía correo al cambiar estado del reclamo
   */
  async enviarCorreoCambioEstado(reclamo: any, estadoAnterior: string): Promise<void> {
    try {
      const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:5173');
      const consultarUrl = `${frontendUrl}/libro-reclamaciones/consultar`;

      let mensajeEstado = '';
      let colorEstado = '#7B1FA2';

      switch (reclamo.estado?.nombre) {
        case 'En proceso':
          mensajeEstado = 'Su reclamo está siendo revisado por nuestro equipo.';
          colorEstado = '#FFA500';
          break;
        case 'Respondido':
          mensajeEstado = 'Hemos respondido a su reclamo. Por favor revise nuestra respuesta.';
          colorEstado = '#2196F3';
          break;
        case 'Cerrado':
          mensajeEstado = 'Su reclamo ha sido cerrado.';
          colorEstado = '#4CAF50';
          break;
        default:
          mensajeEstado = 'El estado de su reclamo ha cambiado.';
      }

      await this.mailerService.sendMail({
        to: reclamo.email,
        subject: `Actualización de Reclamo - ${reclamo.codigo_reclamo}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: ${colorEstado};">Actualización de su Reclamo</h2>

            <p>Estimado/a <strong>${reclamo.nombres} ${reclamo.apellidos}</strong>,</p>

            <p>${mensajeEstado}</p>

            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Código de Reclamo:</strong> ${reclamo.codigo_reclamo}</p>
              <p style="margin: 5px 0;"><strong>Estado Anterior:</strong> ${estadoAnterior}</p>
              <p style="margin: 5px 0;"><strong>Estado Actual:</strong> <span style="color: ${colorEstado}; font-weight: bold;">${reclamo.estado?.nombre}</span></p>
              ${reclamo.fecha_respuesta ? `<p style="margin: 5px 0;"><strong>Fecha de Respuesta:</strong> ${new Date(reclamo.fecha_respuesta).toLocaleString('es-PE')}</p>` : ''}
            </div>

            ${reclamo.respuesta_proveedor ? `
              <h3 style="color: #7B1FA2;">Nuestra Respuesta</h3>
              <div style="background-color: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin: 20px 0;">
                <p style="margin: 0;">${reclamo.respuesta_proveedor}</p>
              </div>
            ` : ''}

            <h3 style="color: #7B1FA2;">Ver Detalles Completos</h3>
            <p>Para ver todos los detalles de su reclamo, ingrese a:</p>
            <p style="text-align: center;">
              <a href="${consultarUrl}" style="display: inline-block; padding: 12px 30px; background-color: #7B1FA2; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Consultar Mi Reclamo
              </a>
            </p>

            <p style="font-size: 12px; color: #666;">
              <strong>Link:</strong> <a href="${consultarUrl}">${consultarUrl}</a>
            </p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

            <p style="font-size: 12px; color: #999;">
              <strong>CONTIGO CRECEMOS E.I.R.L.</strong><br>
              RUC: 20601074380<br>
              Calle 48 Nro. 234, Urb. El Pinar, Comas 15316, Lima, Perú
            </p>
          </div>
        `,
      });

      console.log(`✅ Correo de cambio de estado enviado a: ${reclamo.email}`);
    } catch (error) {
      console.error('❌ Error al enviar correo de cambio de estado:', error);
    }
  }

  /**
   * Notifica a RR.HH. cuando se registra una nueva postulación desde la web.
   * Adjunta el CV (PDF) y todos los datos del postulante.
   */
  async enviarCorreoPostulacion(
    data: {
      id?: number;
      nombre: string;
      apellido: string;
      email: string;
      telefono?: string;
      distrito?: string;
      cargo?: string;
      estado?: string;
      fecha?: Date | string;
    },
    cvPath?: string,
    cvFilename?: string,
  ): Promise<void> {
    try {
      const destino = this.configService.get('RRHH_EMAIL', 'rrhh@crecemos.com.pe');
      const nombreCompleto = `${data.nombre} ${data.apellido}`.trim();
      const fechaTexto = data.fecha
        ? new Date(data.fecha).toLocaleString('es-PE')
        : new Date().toLocaleString('es-PE');

      console.log('📧 Enviando postulación a RR.HH.:', destino, '-', nombreCompleto);

      const remitente = this.configService.get('MAIL_USER');
      const mailOptions: any = {
        from: `"Centro Crecemos - RR.HH." <${remitente}>`,
        to: destino,
        subject: `Nueva postulación: ${data.cargo || 'Sin cargo'} - ${nombreCompleto}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7B1FA2;">Nueva Postulación Recibida</h2>
            <p>Se registró una nueva postulación desde la web pública.</p>

            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              ${data.id ? `<p style="margin: 5px 0;"><strong>N° de Postulación:</strong> ${data.id}</p>` : ''}
              <p style="margin: 5px 0;"><strong>Nombre completo:</strong> ${nombreCompleto}</p>
              <p style="margin: 5px 0;"><strong>Correo:</strong> ${data.email}</p>
              <p style="margin: 5px 0;"><strong>Teléfono:</strong> ${data.telefono || 'No indicado'}</p>
              <p style="margin: 5px 0;"><strong>Distrito:</strong> ${data.distrito || 'No indicado'}</p>
              <p style="margin: 5px 0;"><strong>Cargo al que postula:</strong> ${data.cargo || 'No indicado'}</p>
              <p style="margin: 5px 0;"><strong>Estado:</strong> ${data.estado || 'Nuevo'}</p>
              <p style="margin: 5px 0;"><strong>Fecha de postulación:</strong> ${fechaTexto}</p>
            </div>

            <p>${cvPath ? '📎 Adjunto encontrará el <strong>CV del postulante</strong> en formato PDF.' : 'El postulante no adjuntó CV.'}</p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #999;">
              <strong>CONTIGO CRECEMOS E.I.R.L.</strong><br>
              Notificación automática del sistema de postulaciones.
            </p>
          </div>
        `,
      };

      if (cvPath) {
        mailOptions.attachments = [
          {
            filename: cvFilename || `CV-${nombreCompleto.replace(/\s+/g, '_')}.pdf`,
            path: cvPath,
            contentType: 'application/pdf',
          },
        ];
      }

      await this.mailerService.sendMail(mailOptions);
      console.log(`✅ Correo de postulación enviado a RR.HH.: ${destino}`);
    } catch (error) {
      console.error('❌ Error al enviar correo de postulación a RR.HH.:', error?.message || error);
      // No relanzamos: el correo no debe romper el registro de la postulación
    }
  }

  /**
   * Envía el reporte diario de agenda semanal + recordatorios de citas de mañana.
   * Adjunta un Excel por cada terapeuta activa (la agenda de la semana).
   */
  async enviarReporteAgendaSemanal(opts: {
    to: string[];
    subject: string;
    html: string;
    attachments: { filename: string; content: Buffer }[];
  }): Promise<void> {
    const remitente = this.configService.get('MAIL_USER');
    await this.mailerService.sendMail({
      from: `"Centro Crecemos - Agenda" <${remitente}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      attachments: opts.attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })),
    });
    console.log(`✅ Reporte de agenda enviado a: ${opts.to.join(', ')}`);
  }
}
