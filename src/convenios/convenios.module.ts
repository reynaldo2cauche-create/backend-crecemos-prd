// src/convenios/convenios.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConveniosController } from './convenios.controller';
import { ConveniosService } from './convenios.service';
import { Convenio } from './entities/convenio.entity';
import { PacienteConvenio } from './entities/paciente-convenio.entity';
import { Beneficio } from './entities/beneficio.entity';
import { CategoriaBeneficio } from './entities/categoria-beneficio.entity';
import { BeneficioTermino } from './entities/beneficio-termino.entity';
import { diskStorage } from 'multer';
import * as path from 'path';

@Module({
  imports: [
    TypeOrmModule.forFeature([Convenio, PacienteConvenio, Beneficio, CategoriaBeneficio, BeneficioTermino]),
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, callback) => {
          const uploadPath = path.join(process.cwd(), 'uploads', 'convenios');
          console.log('📁 [MULTER] Intentando guardar archivo en:', uploadPath);
          callback(null, uploadPath);
        },
        filename: (req, file, callback) => {
          try {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = path.extname(file.originalname);
            const filename = `convenio-${uniqueSuffix}${ext}`;
            console.log('📝 [MULTER] Nombre de archivo generado:', filename);
            callback(null, filename);
          } catch (error) {
            console.error('❌ [MULTER] Error generando nombre de archivo:', error);
            callback(error, null);
          }
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, callback) => {
        console.log('🔍 [MULTER] Validando archivo:', {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        });

        const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          console.log('✅ [MULTER] Archivo aceptado');
          callback(null, true);
        } else {
          console.error('❌ [MULTER] Tipo de archivo rechazado:', file.mimetype);
          callback(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Solo se permiten: ${allowedMimes.join(', ')}`), false);
        }
      },
    }),
  ],
  controllers: [ConveniosController],
  providers: [ConveniosService],
  exports: [ConveniosService],
})
export class ConveniosModule {}