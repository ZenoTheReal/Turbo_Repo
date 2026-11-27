import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { Database } from '../src/config/database/database.js';
import { JwtHelperService } from '../src/config/jwt/jwt-helper.service.js';
import { User } from '../src/users/schema/user.entity.js';
import { Role } from '../src/users/schema/role.entity.js';
import { Faq, FaqCategory } from '../src/faqs/schema/faq.entity.js';
import { CmsPage } from '../src/cms/schema/cms-page.entity.js';
import { UserRole, UserStatus } from '@repo/common';

describe('Super Admin Portal Backend (Stats, FAQs, CMS, Users, Stores, Settings) E2E', () => {
  let app: INestApplication<App>;
  let database: Database;
  let adminToken: string;
  let sellerToken: string;
  let tempAdminId: string;
  let tempSellerId: string;

  const createdFaqIds: string[] = [];
  const createdCmsIds: string[] = [];
  const uniqueSuffix = Date.now().toString();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    database = app.get(Database);
    const jwtHelper = app.get(JwtHelperService);
    const roleRepo = database.dataSource.getRepository(Role);
    const userRepo = database.dataSource.getRepository(User);

    const adminRole = await roleRepo.findOneByOrFail({ name: UserRole.ADMIN });
    const sellerRole = await roleRepo.findOneByOrFail({ name: UserRole.SELLER });

    const tempAdmin = await userRepo.save(
      userRepo.create({
        email: `e2e-admin-${uniqueSuffix}@example.com`,
        name: 'E2E Super Admin',
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        role: adminRole,
        roleId: adminRole.id,
      }),
    );
    tempAdminId = tempAdmin.id;

    const tempSeller = await userRepo.save(
      userRepo.create({
        email: `e2e-seller-${uniqueSuffix}@example.com`,
        name: 'E2E Seller',
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        role: sellerRole,
        roleId: sellerRole.id,
      }),
    );
    tempSellerId = tempSeller.id;

    adminToken = jwtHelper.generateAuthTokens({
      sub: tempAdmin.id,
      email: tempAdmin.email,
      role: UserRole.ADMIN,
    }).accessToken;

    sellerToken = jwtHelper.generateAuthTokens({
      sub: tempSeller.id,
      email: tempSeller.email,
      role: UserRole.SELLER,
    }).accessToken;
  }, 30000);

  afterAll(async () => {
    if (database?.dataSource?.isInitialized) {
      if (createdFaqIds.length > 0) {
        await database.dataSource.getRepository(Faq).delete(createdFaqIds);
      }
      if (createdCmsIds.length > 0) {
        await database.dataSource.getRepository(CmsPage).delete(createdCmsIds);
      }
      const userRepo = database.dataSource.getRepository(User);
      if (tempAdminId) await userRepo.delete(tempAdminId);
      if (tempSellerId) await userRepo.delete(tempSellerId);
    }
    if (app) {
      await app.close();
    }
  });

  describe('1. Authorization Guards (401 Unauthenticated & 403 Non-Admin)', () => {
    it('rejects unauthenticated requests to Super Admin routes with 401', async () => {
      await request(app.getHttpServer()).get('/api/admin/stats').expect(401);
      await request(app.getHttpServer()).get('/api/admin/faqs').expect(401);
      await request(app.getHttpServer()).get('/api/admin/cms').expect(401);
      await request(app.getHttpServer()).get('/api/admin/settings').expect(401);
    });

    it('rejects SELLER role tokens on Super Admin routes with 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/api/admin/faqs')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/api/admin/cms')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(403);
    });
  });

  describe('2. FAQ Lifecycle (Admin CRUD, Search/Filter/Sort & Public View)', () => {
    let faqId: string;
    const tag = `e2e-${uniqueSuffix}`;

    it('creates a published FAQ and a draft FAQ', async () => {
      const pubRes = await request(app.getHttpServer())
        .post('/api/admin/faqs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          question: `How does ${tag} shipping work?`,
          answer: 'Orders ship within 2 business days.',
          category: FaqCategory.SHIPPING,
          displayOrder: 1,
          isPublished: true,
        })
        .expect(201);

      faqId = pubRes.body.id;
      createdFaqIds.push(faqId);
      expect(pubRes.body.category).toBe(FaqCategory.SHIPPING);

      const draftRes = await request(app.getHttpServer())
        .post('/api/admin/faqs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          question: `Internal ${tag} draft FAQ`,
          answer: 'Hidden until published.',
          category: FaqCategory.GENERAL,
          displayOrder: 2,
          isPublished: false,
        })
        .expect(201);

      createdFaqIds.push(draftRes.body.id);
    });

    it('exposes only published FAQs on GET /api/faqs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/faqs')
        .query({ search: tag })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(faqId);
    });

    it('supports paginated search, category filter, and sorting on GET /api/admin/faqs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/faqs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          search: tag,
          sortBy: 'displayOrder',
          sortOrder: 'ASC',
          page: 1,
          limit: 10,
        })
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.totalItems).toBe(2);
      expect(res.body.data[0].displayOrder).toBeLessThanOrEqual(res.body.data[1].displayOrder);
    });

    it('updates FAQ via PATCH /api/admin/faqs/:id', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/faqs/${faqId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ answer: 'Express 24h shipping enabled.' })
        .expect(200);

      expect(res.body.answer).toBe('Express 24h shipping enabled.');
    });

    it('deletes FAQ via DELETE /api/admin/faqs/:id', async () => {
      const idToDelete = createdFaqIds.pop()!;
      await request(app.getHttpServer())
        .delete(`/api/admin/faqs/${idToDelete}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('3. CMS Pages Lifecycle (Terms & Policy Slugs, Conflict Guard & Public Lookup)', () => {
    const slug = `terms-${uniqueSuffix}`;
    let cmsId: string;

    it('confirms slug availability via GET /api/admin/cms/check-slug', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/cms/check-slug')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ slug })
        .expect(200);

      expect(res.body).toEqual({ slug, available: true });
    });

    it('creates a published CMS page and rejects duplicate slug with 409 Conflict', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/admin/cms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Terms and Conditions',
          slug,
          summary: 'Platform terms',
          content: '<h2>Terms</h2><p>Legal text here.</p>',
          isPublished: true,
        })
        .expect(201);

      cmsId = created.body.id;
      createdCmsIds.push(cmsId);
      expect(created.body.slug).toBe(slug);

      await request(app.getHttpServer())
        .post('/api/admin/cms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Duplicate Terms',
          slug,
          content: '<p>Duplicate</p>',
        })
        .expect(409);

      const checkTaken = await request(app.getHttpServer())
        .get('/api/admin/cms/check-slug')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ slug })
        .expect(200);

      expect(checkTaken.body.available).toBe(false);
    });

    it('retrieves published CMS page publicly by slug on GET /api/cms/:slug', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/cms/${slug}`)
        .expect(200);

      expect(res.body.id).toBe(cmsId);
      expect(res.body.title).toBe('Terms and Conditions');
    });

    it('hides unpublished CMS page from public GET /api/cms/:slug (404)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/admin/cms/${cmsId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isPublished: false })
        .expect(200);

      await request(app.getHttpServer())
        .get(`/api/cms/${slug}`)
        .expect(404);
    });
  });

  describe('4. Aggregated Admin Statistics, Users, Stores & Settings Endpoints', () => {
    it('returns full aggregated platform statistics on GET /api/admin/stats', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.users.total).toBeGreaterThanOrEqual(2);
      expect(res.body).toHaveProperty('stores');
      expect(res.body).toHaveProperty('faqs');
      expect(res.body).toHaveProperty('cms');
      expect(res.body).toHaveProperty('billing');
    });

    it('supports list, search, filter, and sort on GET /api/users and GET /api/admin/stores', async () => {
      const usersRes = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: uniqueSuffix, sortBy: 'name', sortOrder: 'ASC', page: 1, limit: 10 })
        .expect(200);

      expect(usersRes.body.data.length).toBe(1);
      expect(usersRes.body.meta.totalItems).toBe(1);
      expect(usersRes.body.data[0].id).toBe(tempSellerId);
      expect(usersRes.body.data.every((u: any) => u.role?.name !== UserRole.ADMIN)).toBe(true);

      const storesRes = await request(app.getHttpServer())
        .get('/api/admin/stores')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ sortBy: 'name', sortOrder: 'ASC', page: 1, limit: 10 })
        .expect(200);

      expect(storesRes.body).toHaveProperty('data');
      expect(storesRes.body).toHaveProperty('meta');
    });

    it('retrieves full platform DB settings on GET /api/admin/settings and public Stripe state on GET /api/settings/public', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('platformName');
      expect(res.body).toHaveProperty('commissionRate');
      expect(res.body).toHaveProperty('fixedFee');
      expect(typeof res.body.isStripeEnabled).toBe('boolean');

      const pubRes = await request(app.getHttpServer())
        .get('/api/settings/public')
        .expect(200);

      expect(typeof pubRes.body.isStripeEnabled).toBe('boolean');
      expect(pubRes.body).toHaveProperty('stripePublishableKey');
    });
  });
});
