// One-time administrator setup. Secrets stay in memory; the starter password is
// saved only in the ignored .env.local file, never in command output or Git.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { parseEnv } from 'node:util';
import { createClient } from '@supabase/supabase-js';

const envPath = new URL('../.env.local', import.meta.url);
const env = parseEnv(readFileSync(envPath, 'utf8'));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
if (!url) throw new Error('Add the Supabase URL to .env.local before provisioning.');
const projectRef = new URL(url).hostname.split('.')[0];
if (!/^[a-z]{20}$/.test(projectRef))
  throw new Error('Expected a hosted Supabase project URL in .env.local.');
const ownerEmail = 'morningswithemi@gmail.com';

function cli(args: string[]) {
  try {
    return execFileSync('supabase', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {
    throw new Error(
      'Supabase administrator setup failed. Confirm CLI access to the project and retry. No existing password was changed.'
    );
  }
}

async function main() {
  const result = JSON.parse(
    cli(['projects', 'api-keys', '--project-ref', projectRef, '--reveal', '--output', 'json'])
  );
  const keys: { type?: string; name?: string; api_key?: string }[] = Array.isArray(result)
    ? result
    : result.api_keys;
  const secret =
    keys?.find(key => key.type === 'secret' && key.api_key?.startsWith('sb_secret_'))?.api_key ||
    keys?.find(key => key.name === 'service_role')?.api_key;
  if (!secret)
    throw new Error('The CLI did not return an administrator key. No account was changed.');
  const admin = createClient(url!, secret, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: accounts, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000
  });
  if (listError) throw new Error('Could not inspect the owner account. No account was changed.');
  let owner = accounts.users.find(user => user.email?.toLowerCase() === ownerEmail);
  let created = false;
  if (!owner) {
    const password = env.DRAFTROOM_OWNER_INITIAL_PASSWORD || randomBytes(24).toString('base64url');
    if (!env.DRAFTROOM_OWNER_INITIAL_PASSWORD) {
      writeFileSync(
        envPath,
        readFileSync(envPath, 'utf8').trimEnd() +
          `\n\n# Private starter login; never expose this value in NEXT_PUBLIC_ configuration.\nDRAFTROOM_OWNER_EMAIL=${ownerEmail}\nDRAFTROOM_OWNER_INITIAL_PASSWORD=${password}\n`,
        { mode: 0o600 }
      );
      chmodSync(envPath, 0o600);
    }
    const { data, error } = await admin.auth.admin.createUser({
      email: ownerEmail,
      password,
      email_confirm: true
    });
    if (error)
      throw new Error(
        'Could not create the owner account. Its starter credentials remain in .env.local for a safe retry.'
      );
    owner = data.user;
    created = true;
  }
  cli([
    'db',
    'query',
    '--linked',
    '--project-ref',
    projectRef,
    '--file',
    'supabase/provision-owner.sql',
    '--output',
    'json'
  ]);
  console.log(
    JSON.stringify({
      ownerEmail,
      ownerId: owner.id,
      accountCreated: created,
      starterPasswordSavedLocally: Boolean(created || env.DRAFTROOM_OWNER_INITIAL_PASSWORD),
      workspaceProvisioned: true
    })
  );
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
