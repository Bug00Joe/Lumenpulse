import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('admin_blockchain_audit_logs')
@Index(['actorId'])
@Index(['endpoint'])
@Index(['createdAt'])
@Index(['type', 'createdAt'])
@Index(['actorId', 'createdAt'])
export class AdminBlockchainAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** User ID of the admin who triggered the action */
  @Column({ type: 'varchar', length: 255 })
  actorId: string;

  /** Actor email for readability (non-sensitive label) */
  @Column({ type: 'varchar', length: 255, nullable: true })
  actorEmail: string | null;

  /** HTTP method + path e.g. "POST /grants/rounds" */
  @Column({ type: 'varchar', length: 500 })
  endpoint: string;

  /** Type of audit record, used for retention policy determination */
  @Column({ type: 'varchar', length: 100 })
  type: string;

  /**
   * Target smart contract address or identifier.
   * Derived from the request body or params.
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  targetContract: string | null;

  /**
   * JSON summary of request params with sensitive fields redacted.
   */
  @Column({ type: 'jsonb', nullable: true })
  paramsSummary: Record<string, unknown> | null;

  /**
   * Blockchain transaction hash returned by the action (if any).
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  txHash: string | null;

  /** HTTP status code of the response */
  @Column({ type: 'int', nullable: true })
  responseStatus: number | null;

  /** Timestamp when this record was archived (if archived instead of purged) */
  @Column({ type: 'timestamp', nullable: true })
  archivedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
