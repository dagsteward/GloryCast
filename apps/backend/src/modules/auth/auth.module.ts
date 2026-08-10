import { Module }          from '@nestjs/common'
import { JwtModule }       from '@nestjs/jwt'
import { PassportModule }  from '@nestjs/passport'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AuthController }  from './auth.controller'
import { AuthService }     from './auth.service'
import { JwtStrategy }     from './strategies/jwt.strategy'
import { GoogleStrategy }  from './strategies/google.strategy'

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret:     cfg.get<string>('jwt.secret'),
        signOptions: { expiresIn: cfg.get<string>('jwt.expiresIn') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    // Google sign-in is optional. passport-google-oauth20 throws
    // "OAuth2Strategy requires a clientID option" from its constructor when
    // the credentials are absent, which takes the whole API down at boot —
    // a deployment without Google configured would never start. Registering
    // it conditionally means the rest of the product runs, and email/password
    // auth is unaffected.
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleStrategy]
      : []),
  ],
  exports:     [AuthService, JwtModule],
})
export class AuthModule {}
