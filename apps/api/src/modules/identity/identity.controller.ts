import { Controller, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { RequireScopes } from '../../core/auth/scopes.decorator';
import { ScopesGuard } from '../../core/auth/scopes.guard';
import { AuthGuard } from '@nestjs/passport';
import { Scope } from '@uap/types/scopes';

@Controller('users')
@UseGuards(AuthGuard('jwt'), ScopesGuard)
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post('invite')
  @RequireScopes('users.manage')
  async inviteUser(@Body() body: { email: string; role: string; scopes: Scope[] }) {
    return this.identityService.inviteUser(body.email, body.role, body.scopes);
  }

  @Patch(':id/scopes')
  @RequireScopes('roles.manage')
  async updateScopes(@Param('id') id: string, @Body() body: { scopes: Scope[] }) {
    return this.identityService.updateUserScopes(id, body.scopes);
  }
}
