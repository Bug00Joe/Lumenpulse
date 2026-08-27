import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { AuditService } from './audit.service';

@Injectable()
export class AuditRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditRetentionService.name);
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly auditService: AuditService) {}

  onModuleInit(): void {
    // Purge audited records daily (24 hours). Use setInterval to avoid requiring ScheduleModule.
    this.timer = setInterval(
      () => {
        void this.purgeOldLogsSafely();
      },
      24 * 60 * 60 * 1000,
    );
  }

  private async purgeOldLogsSafely(): Promise<void> {
    try {
      const deleted = await this.auditService.purgeOldLogs();
      this.logger.log(
        `Purged ${deleted} audit log(s) older than retention window`,
      );
    } catch (err) {
      this.logger.error('Failed to purge audit logs', err);
    }
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
