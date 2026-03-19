import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get('MAIL_HOST');
        const port = parseInt(configService.get('MAIL_PORT'), 10);
        const user = configService.get('MAIL_USER');
        const isSecure = port === 465; // SSL para puerto 465

        console.log('📧 Configuración de correo:');
        console.log('   Host:', host);
        console.log('   Port:', port);
        console.log('   User:', user);
        console.log('   Secure:', isSecure);

        const config = {
          transport: {
            host: host,
            port: port,
            secure: isSecure, // true para 465 (SSL), false para 587 (TLS)
            auth: {
              user: user,
              pass: configService.get('MAIL_PASSWORD'),
            },
            tls: {
              rejectUnauthorized: false,
              ciphers: 'SSLv3', // Para compatibilidad con servidores antiguos
            },
            dnsTimeout: 30000, // 30 segundos para resolver DNS
            debug: true,
            logger: true,
            connectionTimeout: 30000, // 30 segundos
            greetingTimeout: 30000,
            socketTimeout: 30000,
          },
          defaults: {
            from: `"Centro Crecemos - Libro de Reclamaciones" <${user}>`,
          },
        };

     

        return config;
      },
      inject: [ConfigService],
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
