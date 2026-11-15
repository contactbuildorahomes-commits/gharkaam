import { supabase, supabaseReady } from './supabase';
import type { AppUser, UserRole } from '../types';

export interface AuthResult {
  user?: AppUser;
  pendingConfirmation?: boolean;
  error?: string;
}

async function resolveProfile(userId: string, email: string, requestedRole: UserRole): Promise<AuthResult> {
  if (!supabase) return { error: 'Supabase is not configured.' };
  const { data: profile, error } = await supabase.from('profiles').select('id, role, display_name').eq('id', userId).maybeSingle();
  if (error || !profile) return { error: error?.message ?? 'Account profile is not ready. Please try again.' };
  const actualRole = profile.role as UserRole;
  if (actualRole !== requestedRole) {
    await supabase.auth.signOut();
    return { error: `This account is registered as ${actualRole}. Choose the matching sign-in path.` };
  }
  let providerStatus: AppUser['providerStatus'];
  if (actualRole === 'provider') {
    const { data: provider } = await supabase.from('providers').select('id, verification_status').eq('user_id', userId).maybeSingle();
    if (provider) providerStatus = provider.verification_status;
    else {
      const { data: created, error: applicationError } = await supabase.from('providers').insert({
        user_id: userId,
        full_name: profile.display_name || email.split('@')[0],
        service_area: 'Lahore',
        service_category_ids: ['electrician', 'plumber'],
        verification_status: 'pending',
      }).select('verification_status').single();
      if (applicationError) return { error: applicationError.message };
      providerStatus = created.verification_status;
    }
  }
  return { user: { id: userId, email, role: actualRole, displayName: profile.display_name || email.split('@')[0], providerStatus } };
}

export async function signInOrRegister(input: { email: string; password: string; displayName: string; role: UserRole; register: boolean }): Promise<AuthResult> {
  if (!supabaseReady || !supabase) return { error: 'Connect Supabase to use account sign-in; demo flows remain available.' };
  if (input.register && input.role === 'admin') return { error: 'Admin accounts cannot be self-registered.' };
  const email = input.email.trim().toLowerCase();
  if (input.register) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: { data: { account_type: input.role === 'provider' ? 'provider' : 'customer', display_name: input.displayName.trim() } },
    });
    if (error) return { error: error.message };
    if (!data.session || !data.user) return { pendingConfirmation: true };
    return resolveProfile(data.user.id, data.user.email ?? email, input.role);
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: input.password });
  if (error) return { error: error.message };
  if (!data.user) return { error: 'Sign-in did not return an account.' };
  return resolveProfile(data.user.id, data.user.email ?? email, input.role);
}

export async function restoreSignedInUser(): Promise<AppUser | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.user) return null;
  const { data: profile } = await supabase.from('profiles').select('id, role, display_name').eq('id', session.user.id).maybeSingle();
  if (!profile) return null;
  let providerStatus: AppUser['providerStatus'];
  if (profile.role === 'provider') {
    const { data: provider } = await supabase.from('providers').select('verification_status').eq('user_id', session.user.id).maybeSingle();
    providerStatus = provider?.verification_status;
  }
  return { id: session.user.id, email: session.user.email ?? '', role: profile.role as UserRole, displayName: profile.display_name, providerStatus };
}

export async function signOut(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
}
