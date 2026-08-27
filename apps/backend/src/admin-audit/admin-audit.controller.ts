import {
  Controller,
  Get,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
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
import { AdminAuditService } from './admin-audit.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/auth.decorators';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('admin-blockchain-audit-logs')
@ApiBearerAuth('JWT-auth')
@Controller('admin/audit/blockchain')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAuditController {
  constructor(private readonly auditService: AdminAuditService) {}

  /**
   * GET /admin/audit/blockchain
   * Query audit logs. Supports filtering by actorId, endpoint, and date range.
   */
  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Get admin blockchain audit logs (admin only)' })
  @ApiQuery({ name: 'actorId', required: false, type: String })
  @ApiQuery({ name: 'endpoint', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (admin only)' })
  async getLogs(@Query() query: QueryAuditLogsDto) {
    const { data, total } = await this.auditService.query({
      actorId: query.actorId,
      endpoint: query.endpoint,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page,
      limit: query.limit,
    });

    return {
      data,
      meta: {
        total,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      },
    };
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export admin blockchain audit logs as JSON (admin only)',
    description:
      'Exports audit logs filtered by optional date range and actor ID. The export itself is recorded in the audit log.',
  })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'Start date (ISO, 8601)' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'End date (ISO, 8601)' })
  @ApiQuery({ name: 'actorId', required: false, type: String, description: 'User ID to filter by' })
  @ApiResponse({ status: 200, description: 'Exported audit logs', schema: { type: 'array' } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (admin only)' })
  @Header('Content-Type', 'application/json')
  @Header('Content-Disposition', 'attachment; filename="admin-blockchain-audit-logs.json"')
  async exportLogs(
    @Req() req: Request,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('actorId') actorId?: string,
  ) {
    const user = req.user as { userId: string } | undefined;
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    const data = await this.auditService.exportLogs(fromDate, toDate, actorId);

    // Audit the export
    await this.auditService.create({
      actorId: user?.userId ?? 'unknown',
      actorEmail: null,
      endpoint: 'GET /admin/audit/blockchain/export',
      params: {
        from: from ?? null,
        to: to ?? null,
        actorId: actorId ?? null,
        recordCount: data.length,
      },
      responseStatus: 200,
    });

    return { data };
  }
}
