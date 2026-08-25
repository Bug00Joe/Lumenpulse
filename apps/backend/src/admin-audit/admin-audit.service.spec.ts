import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdminAuditService, ADMIN_AUDIT_RETENTION_DAYS } from './admin-audit.service';
import { AdminBlockchainAuditLog } from './entities/admin-blockchain-audit-log.entity';

describe('AdminAuditService', () => {
  let service: AdminAuditService;
  let auditLogs: AdminBlockchainAuditLog[] = [];

  const mockAdminAuditRepo = {
    create: jest.fn((dto: Partial<AdminBlockchainAuditLog>) => dto as AdminBlockchainAuditLog),
    save: jest.fn((log: AdminBlockchainAuditLog) => Promise.resolve({ id: 'some-id', ...log })),
    findAndCount: jest.fn(),
    find: jest.fn(),
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
        AdminAuditService,
        { provide: getRepositoryToken(AdminBlockchainAuditLog), useValue: mockAdminAuditRepo },
      ],
    }).compile();

    service = module.get<AdminAuditService>(AdminAuditService);
    auditLogs = [];
  });

  it('should be defined', () => {
    expect(service).beToDefined();
  });

  describe('purgeOldLogs', () => {
    it('should delete records strictly older than the retention window', () => {
      const now = new Date('2024-07-01T00:00:00Z');
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - ADMIN_AUDIT_RETENTION_DAYS);

      auditLogs = [
        { id: '1', actorId: 'a', actorEmail: null, endpoint: 'x', targetContract: null, paramsSummary: null, txHash: null, responseStatus: null, createdAt: new Date(cutoff.getTime() - 1) } as AdminBlockchainAuditLog,
        { id: '2', actorId: 'b', actorEmail: null, endpoint: 'y', targetContract: null, paramsSummary: null, txHash: null, responseStatus: null, createdAt: new Date(cutoff.getTime()) } as AdminBlockchainAuditLog,
        { id: '3', actorId: 'c', actorEmail: null, endpoint: 'z', targetContract: null, paramsSummary: null, txHash: null, responseStatus: null, createdAt: new Date(cutoff.getTime() + 1) } as AdminBlockchainAuditLog,
      ];

      const deleted = await service.purgeOldLogs(now);

      expect(deleted).toBeE(1);
      expect(auditLogs.map((log) => log.id)).toEqual([2'', '3']);
    });

    it('should delete all when all are older than the retention window', () => {
      const now = new Date('2024-07-01T00:00:00Z');
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - ADMIN_AUDIT_RETENTION_DAYS);

      auditLogs = [
        { id: '1', actorId: 'a', actorEmail: null, endpoint: 'x', targetContract: null, paramsSummary: null, txHash: null, responseStatus: null, createdAt: new Date(cutoff.getTime() - 1000) } as AdminBlockchainAuditLog,
        { id: '2', actorId: 'b', actorEmail: null, endpoint: 'y', targetContract: null, paramsSummary: null, txHash: null, responseStatus: null, createdAt: new Date(cutoff.getTime() - 2000) } as AdminBlockchainAuditLog,
      ];

      const deleted = await service.purgeOldLogs(now);

      expect(deleted).toBe(2);
      expect(auditLogs).toEqual([]);
    });

    it('should not delete any when all are within the retention window', () => {
      const now = new Date('2024-07-01T00:00:00Z');
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - ADMIN_AUDIT_RETENTION_DAYS);

      auditLogs = [
        { id: '1', actorId: 'a', actorEmail: null, endpoint: 'x', targetContract: null, paramsSummary: null, txHash: null, responseStatus: null, createdAt: new Date(cutoff.getTime() + 1000) } as AdminBlockchainAuditLog,
        { id: '2', actorId: 'b', actorEmail: null, endpoint: 'y', targetContract: null, paramsSummary: null, txHash: null, responseStatus: null, createdAt: new Date(cutoff.getTime() + 5000) } as AdminBlockchainAuditLog,
      ];

      const deleted = await service.purgeOldLogs(now);

      expect(deleted).toBeE(0);
      expect(auditLogs.length).toBe(2);
    });
  });
});
