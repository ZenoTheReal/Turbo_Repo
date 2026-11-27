import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, firstValueFrom, of, timeout } from 'rxjs';
import { SERVICES, BILLING_PATTERNS, StoreStatus, UserRole, UserStatus } from '@repo/common';
import { Database } from '../config/database/database.js';
import { User } from '../users/schema/user.entity.js';
import { Store } from '../stores/schema/store.entity.js';
import { Faq } from '../faqs/schema/faq.entity.js';
import { CmsPage } from '../cms/schema/cms-page.entity.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@ApiTags('Admin Statistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/stats')
export class AdminStatsController {
  constructor(
    private readonly database: Database,
    @Inject(SERVICES.BILLING) private readonly billingClient: ClientProxy,
  ) {}

  @Get()
  @ApiOperation({ summary: '[ADMIN] Aggregated platform statistics (Users, Stores, FAQs, CMS, Billing)' })
  async getPlatformStats() {
    const userRepo = this.database.dataSource.getRepository(User);
    const storeRepo = this.database.dataSource.getRepository(Store);
    const faqRepo = this.database.dataSource.getRepository(Faq);
    const cmsRepo = this.database.dataSource.getRepository(CmsPage);

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      verifiedUsers,
      roleBreakdownRaw,
      totalStores,
      activeStores,
      pendingStores,
      rejectedStores,
      suspendedStores,
      stripeReadyStores,
      totalFaqs,
      publishedFaqs,
      totalCmsPages,
      publishedCmsPages,
      billingSummary,
    ] = await Promise.all([
      userRepo.count({ where: { isDeleted: false } }),
      userRepo.count({ where: { isDeleted: false, status: UserStatus.ACTIVE } }),
      userRepo.count({ where: { isDeleted: false, status: UserStatus.SUSPENDED } }),
      userRepo.count({ where: { isDeleted: false, isEmailVerified: true } }),
      userRepo
        .createQueryBuilder('user')
        .leftJoin('user.role', 'role')
        .select('role.name', 'roleName')
        .addSelect('COUNT(user.id)', 'count')
        .where('user.isDeleted = false')
        .groupBy('role.name')
        .getRawMany(),
      storeRepo.count(),
      storeRepo.count({ where: { status: StoreStatus.ACTIVE } }),
      storeRepo.count({ where: { status: StoreStatus.PENDING_APPROVAL } }),
      storeRepo.count({ where: { status: StoreStatus.REJECTED } }),
      storeRepo.count({ where: { status: StoreStatus.SUSPENDED } }),
      storeRepo.count({ where: { isPayoutsEnabled: true } }),
      faqRepo.count(),
      faqRepo.count({ where: { isPublished: true } }),
      cmsRepo.count(),
      cmsRepo.count({ where: { isPublished: true } }),
      firstValueFrom(
        this.billingClient.send(BILLING_PATTERNS.GET_PLATFORM_SUMMARY, {}).pipe(
          timeout(2500),
          catchError(() =>
            of({
              totalGmv: 0,
              totalCommissionEarned: 0,
              totalSellerNet: 0,
              paidInvoiceCount: 0,
              pendingPayoutAmount: 0,
              pendingPayoutCount: 0,
              completedPayoutAmount: 0,
            }),
          ),
        ),
      ),
    ]);

    const roleCounts: Record<string, number> = { ADMIN: 0, SELLER: 0, BUYER: 0 };
    for (const row of roleBreakdownRaw) {
      if (row.roleName) {
        roleCounts[row.roleName] = Number(row.count || 0);
      }
    }

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        suspended: suspendedUsers,
        verified: verifiedUsers,
        admins: roleCounts.ADMIN,
        sellers: roleCounts.SELLER,
        buyers: roleCounts.BUYER,
      },
      stores: {
        total: totalStores,
        active: activeStores,
        pendingApproval: pendingStores,
        rejected: rejectedStores,
        suspended: suspendedStores,
        stripeReady: stripeReadyStores,
      },
      faqs: {
        total: totalFaqs,
        published: publishedFaqs,
      },
      cms: {
        total: totalCmsPages,
        published: publishedCmsPages,
      },
      billing: billingSummary,
    };
  }
}
