import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Database } from '../config/database/database.js';
import { Coupon } from './schema/coupon.entity.js';
import { CouponRedemption } from './schema/coupon-redemption.entity.js';
import { CreateCouponDto } from './dto/create-coupon.dto.js';
import { UpdateCouponDto } from './dto/update-coupon.dto.js';
import { ValidateCouponDto } from './dto/validate-coupon.dto.js';
import { DiscountType, CouponScope } from '@repo/common';

@Injectable()
export class CouponsService {
  private readonly couponRepository: Repository<Coupon>;
  private readonly redemptionRepository: Repository<CouponRedemption>;

  constructor(private readonly database: Database) {
    this.couponRepository = this.database.dataSource.getRepository(Coupon);
    this.redemptionRepository = this.database.dataSource.getRepository(CouponRedemption);
  }

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  async createCoupon(storeId: string, dto: CreateCouponDto): Promise<Coupon> {
    const code = this.normalizeCode(dto.code);

    const existing = await this.couponRepository.findOne({
      where: { storeId, code },
    });
    if (existing) {
      throw new ConflictException(`Coupon code "${code}" already exists for this store.`);
    }

    if (dto.discountType === DiscountType.PERCENTAGE && dto.discountValue > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%.');
    }

    const coupon = this.couponRepository.create({
      storeId,
      code,
      description: dto.description,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      maxDiscountAmount: dto.maxDiscountAmount ?? null,
      appliesTo: dto.appliesTo ?? CouponScope.ALL_PRODUCTS,
      applicableCategoryIds: dto.applicableCategoryIds ?? [],
      applicableProductIds: dto.applicableProductIds ?? [],
      minOrderAmount: dto.minOrderAmount ?? 0,
      usageLimit: dto.usageLimit ?? null,
      usageLimitPerCustomer: dto.usageLimitPerCustomer ?? 1,
      timesUsed: 0,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      isActive: dto.isActive ?? true,
    });

    return this.couponRepository.save(coupon);
  }

  async updateCoupon(storeId: string, id: string, dto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.findById(storeId, id);

    if (dto.code && dto.code !== coupon.code) {
      const code = this.normalizeCode(dto.code);
      const existing = await this.couponRepository.findOne({
        where: { storeId, code },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Coupon code "${code}" already exists for this store.`);
      }
      coupon.code = code;
    }

    if (dto.discountType !== undefined) coupon.discountType = dto.discountType;
    if (dto.discountValue !== undefined) coupon.discountValue = dto.discountValue;
    if (dto.maxDiscountAmount !== undefined) coupon.maxDiscountAmount = dto.maxDiscountAmount;
    if (dto.appliesTo !== undefined) coupon.appliesTo = dto.appliesTo;
    if (dto.applicableCategoryIds !== undefined) coupon.applicableCategoryIds = dto.applicableCategoryIds;
    if (dto.applicableProductIds !== undefined) coupon.applicableProductIds = dto.applicableProductIds;
    if (dto.minOrderAmount !== undefined) coupon.minOrderAmount = dto.minOrderAmount;
    if (dto.usageLimit !== undefined) coupon.usageLimit = dto.usageLimit;
    if (dto.usageLimitPerCustomer !== undefined) coupon.usageLimitPerCustomer = dto.usageLimitPerCustomer;
    if (dto.startDate !== undefined) coupon.startDate = dto.startDate ? new Date(dto.startDate) : null;
    if (dto.endDate !== undefined) coupon.endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (dto.isActive !== undefined) coupon.isActive = dto.isActive;

    return this.couponRepository.save(coupon);
  }

  async findById(storeId: string, id: string): Promise<Coupon> {
    const coupon = await this.couponRepository.findOne({
      where: { id, storeId },
    });
    if (!coupon) {
      throw new NotFoundException(`Coupon with ID "${id}" was not found.`);
    }
    return coupon;
  }

  async findCoupons(storeId: string): Promise<Coupon[]> {
    return this.couponRepository.find({
      where: { storeId },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteCoupon(storeId: string, id: string): Promise<{ success: boolean; id: string }> {
    const coupon = await this.findById(storeId, id);
    await this.couponRepository.remove(coupon);
    return { success: true, id };
  }

  async validateCoupon(storeId: string, dto: ValidateCouponDto) {
    const code = this.normalizeCode(dto.code);
    const coupon = await this.couponRepository.findOne({
      where: { storeId, code },
    });

    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('Invalid or inactive coupon code.');
    }

    const now = new Date();
    if (coupon.startDate && now < new Date(coupon.startDate)) {
      throw new BadRequestException('This coupon is not active yet.');
    }
    if (coupon.endDate && now > new Date(coupon.endDate)) {
      throw new BadRequestException('This coupon has expired.');
    }

    if (coupon.usageLimit && coupon.timesUsed >= coupon.usageLimit) {
      throw new BadRequestException('This coupon has reached its total usage limit.');
    }

    if (dto.userId) {
      const customerRedemptions = await this.redemptionRepository.count({
        where: { couponId: coupon.id, userId: dto.userId },
      });
      if (customerRedemptions >= coupon.usageLimitPerCustomer) {
        throw new BadRequestException('You have reached the maximum redemptions for this coupon.');
      }
    }

    const eligibleItems = dto.cartItems.filter((item) => {
      if (coupon.appliesTo === CouponScope.ALL_PRODUCTS) {
        return true;
      }
      if (coupon.appliesTo === CouponScope.SPECIFIC_CATEGORIES) {
        return item.categoryId && (coupon.applicableCategoryIds ?? []).includes(item.categoryId);
      }
      if (coupon.appliesTo === CouponScope.SPECIFIC_PRODUCTS) {
        return (coupon.applicableProductIds ?? []).includes(item.productId);
      }
      return false;
    });

    if (eligibleItems.length === 0) {
      throw new BadRequestException('None of the items in your cart are eligible for this coupon.');
    }

    const eligibleSubtotal = eligibleItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const cartSubtotal = dto.cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

    if (eligibleSubtotal < Number(coupon.minOrderAmount)) {
      throw new BadRequestException(
        `Eligible items total (${eligibleSubtotal.toFixed(2)}) does not meet the minimum order requirement (${Number(coupon.minOrderAmount).toFixed(2)}).`,
      );
    }

    let discountAmount = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount = (eligibleSubtotal * Number(coupon.discountValue)) / 100;
      if (coupon.maxDiscountAmount && discountAmount > Number(coupon.maxDiscountAmount)) {
        discountAmount = Number(coupon.maxDiscountAmount);
      }
    } else if (coupon.discountType === DiscountType.FIXED_AMOUNT) {
      discountAmount = Math.min(Number(coupon.discountValue), eligibleSubtotal);
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    const finalSubtotal = Math.max(0, Math.round((cartSubtotal - discountAmount) * 100) / 100);

    return {
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: Number(coupon.discountValue),
      discountAmount,
      eligibleSubtotal,
      cartSubtotal,
      finalSubtotal,
      appliesTo: coupon.appliesTo,
    };
  }
}
