# OIDC Provider Setup Guides

Vinyl Vault uses generic OpenID Connect. Any OIDC-compliant provider works.

## Authentik

1. In Authentik admin, create a **Provider** (type: OAuth2/OIDC):
   - **Authorization flow**: default-provider-authorization-implicit-consent
   - **Signing Key**: authentic Self-signed Certificate (or generate one)

2. Create an **Application**:
   - **Slug**: `vinyl-vault`
   - **Provider**: the one from step 1

3. Configure redirect URIs in the Provider:
   - **Desktop**: `http://127.0.0.1:17823/callback`
   - **Web**: `https://your-domain.com/api/auth/callback`

4. Set environment variables:
```bash
OIDC_ISSUER=https://auth.yourdomain.com/application/o/vinyl-vault/
OIDC_CLIENT_ID=<your-client-id>
OIDC_CLIENT_SECRET=<your-client-secret>
OIDC_JWKS_URL=https://auth.yourdomain.com/application/o/vinyl-vault/jwks/
```

> **Note:** If your Authentik groups aren't showing up, verify the scope mapping
> is attached to the provider (Authentik → Providers → Edit → Scopes).

## Keycloak

1. Create a **Realm** (or use the default `master`).
2. Create a **Client**:
   - **Client ID**: `vinyl-vault`
   - **Client Protocol**: openid-connect
   - **Access Type**: confidential
3. Set redirect URIs:
   - **Desktop**: `http://127.0.0.1:17823/callback`
   - **Web**: `https://your-domain.com/api/auth/callback`
4. Set environment variables:
```bash
OIDC_ISSUER=https://keycloak.yourdomain.com/realms/your-realm
OIDC_CLIENT_ID=vinyl-vault
OIDC_CLIENT_SECRET=<client-secret-from-credentials-tab>
```
> `OIDC_JWKS_URL` is optional — derived from issuer's `.well-known/openid-configuration` automatically.

## Auth0

1. Create a **Regular Web Application**.
2. Set **Allowed Callback URLs**:
   - `http://127.0.0.1:17823/callback`
   - `https://your-domain.com/api/auth/callback`
3. Set **Allowed Logout URLs**: `https://your-domain.com`
4. Set environment variables:
```bash
OIDC_ISSUER=https://your-tenant.auth0.com
OIDC_CLIENT_ID=<client-id>
OIDC_CLIENT_SECRET=<client-secret>
```

## Okta

1. Create an **OIDC Web Application**.
2. Set **Sign-in redirect URIs**:
   - `http://127.0.0.1:17823/callback`
   - `https://your-domain.com/api/auth/callback`
3. Set **Sign-out redirect URIs**: `https://your-domain.com`
4. Set environment variables:
```bash
OIDC_ISSUER=https://your-domain.okta.com
OIDC_CLIENT_ID=<client-id>
OIDC_CLIENT_SECRET=<client-secret>
```

## General OIDC Discovery

Vinyl Vault follows the standard OIDC discovery protocol. If your provider
supports `.well-known/openid-configuration`, set `OIDC_ISSUER` and the JWKS
URL is derived automatically. For providers that don't, set `OIDC_JWKS_URL`
explicitly.

## Groups / Demo Mode

If your provider includes a `groups` claim in access tokens, set
`NEXT_PUBLIC_DEMO_GROUP_NAME=demo-users` (default) to restrict demo users.
The demo group has read-only access.
