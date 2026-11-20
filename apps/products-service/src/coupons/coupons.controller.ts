import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { COUPON_PATTERNS } from '@repo/common';
import { CouponsService } from './coupons.service.js';
import { CreateCouponDto } from './dto/create-coupon.dto.js';
import { UpdateCouponDto } from './dto/update-coupon.dto.js';
import { ValidateCouponDto } from './dto/validate-coupon.dto.js';

@Controller()
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @MessagePattern(COUPON_PATTERNS.CREATE)
  async createCoupon(@Payload() data: { storeId: string; dto: CreateCouponDto }) {
    return this.couponsService.createCoupon(data.storeId, data.dto);
  }

  @MessagePattern(COUPON_PATTERNS.UPDATE)
  async updateCoupon(@Payload() data: { storeId: string; id: string; dto: UpdateCouponDto }) {
    return this.couponsService.updateCoupon(data.storeId, data.id, data.dto);
  }

  @MessagePattern(COUPON_PATTERNS.FIND_ALL)
  async findCoupons(@Payload() data: { storeId: string }) {
    return this.couponsService.findCoupons(data.storeId);
  }

  @MessagePattern(COUPON_PATTERNS.FIND_ONE)
  async findCoupon(@Payload() data: { storeId: string; id: string }) {
    return this.couponsService.findById(data.storeId, data.id);
  }

  @MessagePattern(COUPON_PATTERNS.VALIDATE)
  async validateCoupon(@Payload() data: { storeId: string; dto: ValidateCouponDto }) {
    return this.couponsService.validateCoupon(data.storeId, data.dto);
  }

  @MessagePattern(COUPON_PATTERNS.DELETE)
  async deleteCoupon(@Payload() data: { storeId: string; id: string }) {
    return this.couponsService.deleteCoupon(data.storeId, data.id);
  }
}
