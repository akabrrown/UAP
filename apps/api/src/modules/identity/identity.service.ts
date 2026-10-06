import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Scope } from '@uap/types/scopes';

@Injectable()
export class IdentityService {
  private supabaseAdmin: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || 'http://127.0.0.1:54321';
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || 'dummy';
    
    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async inviteUser(email: string, role: string, scopes: Scope[]) {
    const { data, error } = await this.supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { role, scopes },
    });
    
    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return data;
  }

  async updateUserScopes(userId: string, scopes: Scope[]) {
    const { data, error } = await this.supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: { scopes },
    });

    if (error) {
      throw new InternalServerErrorException(error.message);
    }
    return data;
  }
}
