import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

const authority = import.meta.env.VITE_OIDC_AUTHORITY?.trim() ?? '';
const clientId = import.meta.env.VITE_OIDC_CLIENT_ID?.trim() ?? '';
const redirectUri = import.meta.env.VITE_OIDC_REDIRECT_URI?.trim() || `${window.location.origin}/auth/callback`;
const postLogoutRedirectUri = import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI?.trim() || window.location.origin;
const scope = import.meta.env.VITE_OIDC_SCOPE?.trim() || 'openid profile email';

export const oidcConfigured = Boolean(authority && clientId);

export const oidcUserManager = oidcConfigured
  ? new UserManager({
      authority,
      client_id: clientId,
      redirect_uri: redirectUri,
      post_logout_redirect_uri: postLogoutRedirectUri,
      response_type: 'code',
      scope,
      // Keep the session scoped to this browser tab/session rather than long-lived local storage.
      userStore: new WebStorageStateStore({ store: window.sessionStorage }),
      stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
      automaticSilentRenew: false,
      loadUserInfo: false,
    })
  : null;

export function getOidcConfigurationStatus(): string {
  if (oidcConfigured) return 'configured';
  return 'not-configured';
}
