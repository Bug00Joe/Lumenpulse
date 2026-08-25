import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Req,
  Header,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/auth.decorators';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('admin-audit-logs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all audit logs (admin only)',
    description:
      'Retrieves a paginated list of audit logs. Requires admin privileges.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
    schema: {
      properties: {
        logs: {
          type: 'array',
          items: {
            properties: {
              id: { type: 'string', format: 'uuid' },
              userId: { type: 'string', format: 'uuid', nullable: true },
              action: { type: 'string', example: 'login' },
              ipAddress: { type: 'string', example: '127.0.0.1' },
              metadata: { type: 'object', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        count: { type: 'number', example: 1 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (admin only)' })
  async getAuditLogs(
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    const [logs, count] = await this.auditService.findAll(limit, offset);
    return { logs, count };
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export audit logs as JSON (admin only)',
    description:
      'Exports audit logs filtered by optional date range and actor ID. The export itself is recorded in the audit log.',
  })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'End date (ISO 8601)' })
  @ApiQuery({ name: 'actorId', required: false, type: String, description: 'User ID to filter by' })
  @ApiResponse({ status: 200, description: 'Exported audit logs', schema: { type: 'array' } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (admin only)' })
  @Header('Content-Type', 'application/json')
  @Header('Content-Disposition', 'attachment; filename="audit-logs.json"')
  async exportAuditLogs(
    @Req() req: Request,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('actorId') actorId?: string,
  ) {
    const user = req.user as { userId: string } | undefined;
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const logs = await this.auditService.exportLogs(fromDate, toDate, actorId);

    // Audit the export
    await this.auditService.log(
      'AUDIT_EXPORT',
      user?.userId ?? null,
      req.ip ?? null,
      {
        from: from ?? null,
        to: to ?? null,
        actorId: actorId ?? null,
        recordCount: logs.length,
      },
    );

    return { logs };
  }
}
