import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminBlockchainAuditLog } from './entities/admin-blockchain-audit-log.entity';
import { AdminAuditService } from './admin-audit.service';
import { AdminAuditController } from './admin-audit.controller';
import { AdminAuditInterceptor } from './interceptors/admin-audit.interceptor';
import { AdminAuditRetentionService } from './admin-audit-retention.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminBlockchainAuditLog])],
  providers: [
    AdminAuditService,
    AdminAuditInterceptor,
    AdminAuditRetentionService,
  ],
  controllers: [AdminAuditController],
  exports: [AdminAuditService, AdminAuditInterceptor],
})
export class AdminAuditModule {}
