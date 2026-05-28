import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, Profile } from 'passport-google-oauth20'
import { ConfigService }     from '@nestjs/config'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(cfg: ConfigService) {
    super({
      clientID:     cfg.get<string>('oauth.google.clientId')!,
      clientSecret: cfg.get<string>('oauth.google.clientSecret')!,
      callbackURL:  cfg.get<string>('oauth.google.callbackUrl')!,
      scope: ['email', 'profile'],
    })
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    const email = profile.emails?.[0]?.value
    return {
      googleId:  profile.id,
      email,
      firstName: profile.name?.givenName ?? '',
      lastName:  profile.name?.familyName ?? '',
      avatarUrl: profile.photos?.[0]?.value,
    }
  }
}
