'use client';
import {useState} from 'react';
import {Box, Card, Heading, Text, Stack, Alert, Dialog, Portal} from '@chakra-ui/react';
import {Button, Field, Input} from './ui';

export function AccountShell({title, children}) {
  return <Box as="main" className="account-page">
    <Card.Root className="account-card" bg="draftroom.surface" borderColor="draftroom.border" borderRadius="16px">
      <Card.Body gap="6" padding={{base: '6', md: '8'}}>
        <div className="brand"><span className="brandmark" aria-hidden="true">✳</span>draftroom</div>
        <Heading as="h1">{title}</Heading>
        {children}
      </Card.Body>
    </Card.Root>
  </Box>;
}

export function SignIn({client, sessionError}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(sessionError || '');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const {error} = await client.auth.signInWithPassword({email: email.trim(), password});
      if (error) setError('We couldn’t sign you in. Check your email and password, then try again.');
    } catch {
      setError('We couldn’t reach your workspace. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }
  return <AccountShell title="Your ideas have a home.">
    <Text className="subtitle">Sign in to your private workspace to pick up where you left off.</Text>
    <form onSubmit={submit}>
      <Stack gap="5">
        <Field label="Email"><Input required autoFocus autoComplete="username" type="email" value={email} onChange={e => setEmail(e.target.value)}/></Field>
        <Field label="Password"><Input required autoComplete="current-password" type="password" value={password} onChange={e => setPassword(e.target.value)}/></Field>
        {error && <Text role="alert" className="warning">{error}</Text>}
        <Button type="submit" className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to draftroom'}</Button>
      </Stack>
    </form>
    <Text className="footnote">This is a private workspace. Use the account created by the project owner.</Text>
  </AccountShell>;
}

export function WorkspaceProblem({message, retry, signOut}) {
  return <AccountShell title="Let’s reconnect your workspace.">
    <Text role="alert">{message}</Text>
    <Text className="subtitle">Your saved copies have been preserved.</Text>
    <Stack direction="row" gap="3">
      <Button className="primary" onClick={retry}>Try again</Button>
      {signOut && <Button onClick={signOut}>Sign out</Button>}
    </Stack>
  </AccountShell>;
}

export function SyncNotice({cloud, error, cacheError, conflict, retry, resolve, exportData}) {
  const [resolving, setResolving] = useState(false);
  const [resolutionError, setResolutionError] = useState('');
  async function choose(choice) {
    setResolving(true);
    setResolutionError('');
    try { await resolve(choice); }
    catch { setResolutionError('Could not preserve a recovery copy. Export your drafts, then try again.'); }
    finally { setResolving(false); }
  }
  if (!cloud) return <Alert.Root colorPalette="pistachio" bg="draftroom.accentSoft" color="draftroom.ink" status="info" className="sync-notice" variant="subtle">
    <Alert.Indicator color="draftroom.mossStrong"/>
    <Alert.Content><Alert.Title>Saved on this browser</Alert.Title><Alert.Description>Cloud storage isn’t connected yet. Your drafts are available on this device.</Alert.Description></Alert.Content>
  </Alert.Root>;
  if (conflict) return <Alert.Root colorPalette="pistachio" bg="draftroom.warning" color="draftroom.ink" status="warning" className="sync-notice" variant="subtle">
    <Alert.Indicator color="draftroom.mossStrong"/>
    <Alert.Content>
      <Alert.Title>A newer version is saved in the cloud</Alert.Title>
      <Alert.Description>Choose which version to continue with. The version being replaced is kept as a recovery copy on this browser.</Alert.Description>
      {resolutionError && <Text role="alert" fontSize="sm">{resolutionError}</Text>}
      <Stack direction={{base: 'column', md: 'row'}} gap="3" mt="3">
        <Button onClick={exportData}>Export this device’s version</Button>
        <Button disabled={resolving} onClick={() => choose('cloud')}>Load cloud version</Button>
        <Button disabled={resolving} className="primary" onClick={() => choose('local')}>Keep this device’s version</Button>
      </Stack>
    </Alert.Content>
  </Alert.Root>;
  if (!error && !cacheError) return null;
  return <Alert.Root colorPalette="pistachio" bg="draftroom.warning" color="draftroom.ink" status="warning" className="sync-notice" variant="subtle">
    <Alert.Indicator color="draftroom.mossStrong"/>
    <Alert.Content><Alert.Title>Some changes need attention</Alert.Title><Alert.Description>{error || cacheError}</Alert.Description>
      <Stack direction="row" gap="3" mt="3"><Button onClick={retry}>Retry sync</Button><Button onClick={exportData}>Export backup</Button></Stack>
    </Alert.Content>
  </Alert.Root>;
}

export function SignOutConfirmation({onClose, onConfirm, exportData, cacheError}) {
  return <Dialog.Root open onOpenChange={({open}) => { if (!open) onClose(); }} placement="center">
    <Portal><Dialog.Backdrop bg="draftroom.overlay"/><Dialog.Positioner padding="5">
      <Dialog.Content bg="draftroom.surface" borderRadius="16px" maxWidth="460px" padding="6">
        <Dialog.Header><Dialog.Title>Keep your latest changes safe.</Dialog.Title></Dialog.Header>
        <Dialog.Body><Text>{cacheError ? 'This browser could not save a recovery copy. Export a backup before signing out.' : 'Your latest changes are saved on this device, but have not reached the cloud. They will be here when you sign in again on this browser.'}</Text></Dialog.Body>
        <Dialog.Footer flexWrap="wrap" gap="3"><Button onClick={exportData}>Export backup</Button><Button onClick={onClose}>Keep working</Button><Button disabled={Boolean(cacheError)} onClick={onConfirm}>Sign out</Button></Dialog.Footer>
      </Dialog.Content>
    </Dialog.Positioner></Portal>
  </Dialog.Root>;
}
