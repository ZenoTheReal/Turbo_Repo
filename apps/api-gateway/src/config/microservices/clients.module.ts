import { Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SERVICES } from '@repo/common';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: SERVICES.EMAIL,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('EMAIL_SERVICE_HOST', '127.0.0.1'),
            port: Number(configService.get<number>('EMAIL_SERVICE_PORT', 3005)),
          },
        }),
      },
      {
        name: SERVICES.ORDERS,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('ORDERS_SERVICE_HOST', '127.0.0.1'),
            port: Number(configService.get<number>('ORDERS_SERVICE_PORT', 3003)),
          },
        }),
      },
      {
        name: SERVICES.BILLING,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('BILLING_SERVICE_HOST', '127.0.0.1'),
            port: Number(configService.get<number>('BILLING_SERVICE_PORT', 3004)),
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class MicroserviceClientsModule { }