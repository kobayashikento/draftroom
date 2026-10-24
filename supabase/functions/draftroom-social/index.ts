import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2.118.0/cors';
import type { Database } from '../../../lib/database.types.ts';
import { createSocialHandler } from '../_shared/social-handler.ts';
import { createSocialService } from '../_shared/social-service.ts';
import { createSocialRepository } from '../_shared/social-repository.ts';
import { socialEnvironment } from '../_shared/social-environment.ts';

const env = socialEnvironment(name => Deno.env.get(name));
const admin = createClient<Database>(env.supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const service = createSocialService(createSocialRepository(admin), env);

Deno.serve(
  createSocialHandler({
    service,
    corsHeaders,
    authorize: async request => {
      const authorization = request.headers.get('Authorization');
      if (!authorization?.startsWith('Bearer ')) return null;
      const client = createClient<Database>(env.supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const {
        data: { user },
        error
      } = await client.auth.getUser(authorization.slice(7));
      if (error || !user) return null;
      const result = await client
        .from('draftroom_workspaces')
        .select('owner_id')
        .eq('owner_id', user.id)
        .maybeSingle();
      if (result.error || !result.data) return null;
      return user.id;
    }
  })
);
