import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthModule } from './core/auth/auth.module';
import { CloudinaryModule } from './core/cloudinary/cloudinary.module';
import { IdentityModule } from './modules/identity/identity.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule.register({
      isGlobal: true,
    }),
    AuthModule,
    CloudinaryModule,
    IdentityModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
