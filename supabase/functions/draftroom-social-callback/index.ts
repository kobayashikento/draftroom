import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import type { Database } from '../../../lib/database.types.ts';
import { createSocialCallbackHandler } from '../_shared/social-handler.ts';
import { createSocialService } from '../_shared/social-service.ts';
import { createSocialRepository } from '../_shared/social-repository.ts';
import { socialEnvironment } from '../_shared/social-environment.ts';

const env = socialEnvironment(name => Deno.env.get(name));
const client = createClient<Database>(env.supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false }
});
// This public OAuth callback only consumes an unguessable, expiring, single-use state.
// All library operations live in the separate JWT-protected draftroom-social function.
Deno.serve(createSocialCallbackHandler(createSocialService(createSocialRepository(client), env)));
