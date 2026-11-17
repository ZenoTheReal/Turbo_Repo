import { Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { SERVICES } from '@repo/common';

@Global()
@Module({
  imports: [
    ClientsModule.register([
      {
        name: SERVICES.EMAIL,
        transport: Transport.TCP,
        options: {
          host: '127.0.0.1',
          port: 3005,
        },
      },
      {
        name: SERVICES.ORDERS,
        transport: Transport.TCP,
        options: {
          host: '127.0.0.1',
          port: 3003,
        },
      },
      {
        name: SERVICES.BILLING,
        transport: Transport.TCP,
        options: {
          host: '127.0.0.1',
          port: 3004,
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class MicroserviceClientsModule {}
