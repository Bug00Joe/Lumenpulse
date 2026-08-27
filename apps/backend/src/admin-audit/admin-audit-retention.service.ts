import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { AdminAuditService } from './admin-audit.service';

@Injectable()
export class AdminAuditRetentionService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AdminAuditRetentionService.name);
  private timer: ReturnType<typeof setInterval> | undefined;

  constructor(private readonly adminAuditService: AdminAuditService) {}

  onModuleInit(): void {
    this.timer = setInterval(
      () => {
        void this.purgeOldLogsSafely();
      },
      24 * 60 * 60 * 1000,
    );
  }

  private async purgeOldLogsSafely(): Promise<void> {
    try {
      const deleted = await this.adminAuditService.purgeOldLogs();
      this.logger.log(
        `Purged ${deleted} admin blockchain audit log(s) older than retention window`,
      );
    } catch (err) {
      this.logger.error('Failed to purge admin blockchain audit logs', err);
    }
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
