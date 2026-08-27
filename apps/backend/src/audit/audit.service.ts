import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  LessThan,
  MoreThanOrEqual,
  LessThanOrEqual,
  Between,
} from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export const AUDIT_LOG_RETENTION_DAYS = 90;

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  async log(
    action: string,
    userId: string | null,
    ipAddress: string | null,
    metadata?: Record<string, any>,
  ): Promise<AuditLog> {
    const auditLog = this.auditLogRepo.create({
      action,
      userId,
      ipAddress,
      metadata: metadata || null,
    });
    return this.auditLogRepo.save(auditLog);
  }

  async findAll(limit = 100, offset = 0): Promise<[AuditLog[], number]> {
    return this.auditLogRepo.findAndCount({
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async delete(id: string): Promise<void> {
    await this.auditLogRepo.delete(id);
  }

  async purgeOldLogs(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - AUDIT_LOG_RETENTION_DAYS);
    const result = await this.auditLogRepo.delete({
      createdAt: LessThan(cutoff),
    });
    return result.affected ?? 0;
  }

  async exportLogs(
    from?: Date,
    to?: Date,
    actorId?: string,
  ): Promise<AuditLog[]> {
    const where: Record<string, unknown> = {};
    if (actorId) {
      where.userId = actorId;
    }

    if (from && to) {
      where.createdAt = Between(from, to);
    } else if (from) {
      where.createdAt = MoreThanOrEqual(from);
    } else if (to) {
      where.createdAt = LessThanOrEqual(to);
    }

    return this.auditLogRepo.find({
      where,
      order: { createdAt: 'ASC' },
    });
  }
}
