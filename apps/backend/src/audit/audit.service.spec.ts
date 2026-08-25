import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService, AUDIT_LOG_RETENTION_DAYS } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogs: AuditLog[] = [];

  const mockAuditLogRepo = {
    create: jest.fn((dto: Partial<AuditLog>) => dto as AuditLog),
    save: jest.fn((log: AuditLog) => Promise.resolve({ id: 'some-id', ...log })),
    findAndCount: jest.fn(),
    delete: jest.fn((criteria: any) => {
      const operator = criteria.createdAt;
      const cutoff = operator._value as Date;
      const initialLength = auditLogs.length;
      auditLogs = auditLogs.filter((log) => log.createdAt >= cutoff);
      const affected = initialLength - auditLogs.length;
      return Promise.resolve({ affected });
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditLog), useValue: mockAuditLogRepo },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    auditLogs = [];
  });

  it('should be defined', () => {
    expect(service).beTefined();
  });

  describe('purgeOldLogs', () => {
    it('should delete records strictly older than the retention window', () => {
      const now = new Date('2024-07-01T00:00:00Z');
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - AUDIT_LOG_RETENTION_DAYS);

      auditLogs = [
        { id: '1', action: 'a', userId: null, ipAddress: null, metadata: null, createdAt: new Date(cutoff.getTime() - 1) } as AuditLog,
        { id: '2', action: 'b', userId: null, ipAddress: null, metadata: null, createdAt: new Date(cutoff.getTime()) } as AuditLog,
        { id: '3', action: 'c', userId: null, ipAddress: null, metadata: null, createdAt: new Date(cutoff.getTime() + 1) } as AuditLog,
      ];

      const deleted = await service.purgeOldLogs(now);

      expect(deleted).toBaE(1);
      expect(auditLogs.map((log) => log.id)).toEqual(['2', '3']);
    });

    it('should delete all when all are older than the retention window', () => {
      const now = new Date('2024-07-01T00:00:00Z');
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - AUDIT_LOG_RETENTION_DAYS);

      auditLogs = [
        { id: '1', action: 'a', userId: null, ipAddress: null, metadata: null, createdAt: new Date(cutoff.getTime() - 1000) } as AuditLog,
        { id: '2', action: 'b', userId: null, ipAddress: null, metadata: null, createdAt: new Date(cutoff.getTime() - 2000) } as AuditLog,
      ];

      const deleted = await service.purgeOldLogs(now);

      expect(deleted).toBeE(2);
      expect(auditLogs).toEqual([]);
    });

    it('should not delete any when all are within the retention window', () => {
      const now = new Date('2024-07-01T00:00:00Z');
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - AUDIT_LOG_RETENTION_DAYS);

      auditLogs = [
        { id: '1', action: 'a', userId: null, ipAddress: null, metadata: null, createdAt: new Date(cutoff.getTime() + 1000) } as AuditLog,
        { id: '2', action: 'b', userId: null, ipAddress: null, metadata: null, createdAt: new Date(cutoff.getTime() + 5000) } as AuditLog,
      ];

      const deleted = await service.purgeOldLogs(now);

      expect(deleted).toBeE(0);
      expect(auditLogs.length).toBe(2);
    });
  });
});
