import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseJwtPayload,
  extractAuthorities,
  hasAdminAuthority,
  validateLogin,
  isTokenExpired,
  saveAuthSession,
  clearAuthSession,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredUser,
  loginApi,
  refreshApi,
} from '../src/domains/auth/auth-service';
import {
  apiClient,
  setAuthToken,
  setRefreshToken,
  getAuthToken,
  getRefreshToken,
  onAuthExpired,
  ApiClientError,
} from '../src/lib/api-client';

// Mock in-memory localStorage for Node testing environment
const mockStorage: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => {
    mockStorage[key] = String(value);
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
  },
};

// Polyfill global window and localStorage
(globalThis as any).window = {
  localStorage: mockLocalStorage,
  location: { pathname: '/', search: '' },
  atob: (b64: string) => ((globalThis as any).Buffer ? (globalThis as any).Buffer.from(b64, 'base64').toString('binary') : atob(b64)),
  history: {
    replaceState: (_data: any, _unused: string, url: string) => {
      (globalThis as any).window.location.pathname = url.split('?')[0];
    },
  },
};
(globalThis as any).localStorage = mockLocalStorage;

// Helper to create mock JWT tokens with specific payload
function createMockJwt(claims: Record<string, any>): string {
  const buf = (globalThis as any).Buffer;
  const header = buf.from(JSON.stringify({ alg: 'HS512', typ: 'JWT' })).toString('base64url');
  const payload = buf.from(JSON.stringify(claims)).toString('base64url');
  const signature = 'mock_signature_test';
  return `${header}.${payload}.${signature}`;
}

test('1. parseJwtPayload - Correctly decodes claims from valid JWT', () => {
  const token = createMockJwt({
    sub: 'admin@snapvocab.com',
    auth: 'ROLE_ADMIN',
    userId: 42,
    exp: 1800000000,
  });

  const payload = parseJwtPayload(token);
  assert.ok(payload);
  assert.equal(payload!.sub, 'admin@snapvocab.com');
  assert.equal(payload!.auth, 'ROLE_ADMIN');
  assert.equal(payload!.userId, 42);
  assert.equal(payload!.exp, 1800000000);
});

test('2. parseJwtPayload - Returns null on invalid or malformed tokens', () => {
  assert.equal(parseJwtPayload(''), null);
  assert.equal(parseJwtPayload('invalid.token'), null);
  assert.equal(parseJwtPayload('invalid-single-token'), null);
});

test('3. extractAuthorities - Parses single and space-separated authority claims', () => {
  const adminToken = createMockJwt({ auth: 'ROLE_ADMIN' });
  const multiAuthToken = createMockJwt({ auth: 'ROLE_USER ROLE_ADMIN' });
  const userToken = createMockJwt({ auth: 'ROLE_USER' });
  const emptyToken = createMockJwt({});

  assert.deepEqual(extractAuthorities(adminToken), ['ROLE_ADMIN']);
  assert.deepEqual(extractAuthorities(multiAuthToken), ['ROLE_USER', 'ROLE_ADMIN']);
  assert.deepEqual(extractAuthorities(userToken), ['ROLE_USER']);
  assert.deepEqual(extractAuthorities(emptyToken), []);
});

test('4. hasAdminAuthority - Strictly identifies ROLE_ADMIN', () => {
  assert.equal(hasAdminAuthority(['ROLE_ADMIN']), true);
  assert.equal(hasAdminAuthority(['ROLE_USER', 'ROLE_ADMIN']), true);
  assert.equal(hasAdminAuthority(['ROLE_USER']), false);
  assert.equal(hasAdminAuthority([]), false);
});

test('5. isTokenExpired - Accurately detects valid vs expired tokens with safety buffer', () => {
  const nowSeconds = Math.floor(Date.now() / 1000);

  // Expired in past
  const pastToken = createMockJwt({ exp: nowSeconds - 100 });
  assert.equal(isTokenExpired(pastToken), true);

  // Expiring within 30s buffer window
  const bufferToken = createMockJwt({ exp: nowSeconds + 15 });
  assert.equal(isTokenExpired(bufferToken, 30), true);

  // Far future token
  const futureToken = createMockJwt({ exp: nowSeconds + 3600 });
  assert.equal(isTokenExpired(futureToken, 30), false);
});

test('6. Session Storage Helpers - save, get, and clear session', () => {
  mockLocalStorage.clear();

  const mockSession = {
    accessToken: 'access_abc_123',
    refreshToken: 'refresh_xyz_789',
    user: { id: 1, email: 'admin@snapvocab.com', firstName: 'Admin', lastName: 'User' },
    authorities: ['ROLE_ADMIN'],
  };

  saveAuthSession(mockSession);
  assert.equal(getStoredAccessToken(), 'access_abc_123');
  assert.equal(getStoredRefreshToken(), 'refresh_xyz_789');
  assert.deepEqual(getStoredUser(), mockSession.user);

  clearAuthSession();
  assert.equal(getStoredAccessToken(), null);
  assert.equal(getStoredRefreshToken(), null);
  assert.equal(getStoredUser(), null);
});

test('7. loginApi - Successfully calls backend and unwraps FormatRestResponse', async () => {
  const originalFetch = globalThis.fetch;
  let sentBody: any = null;

  globalThis.fetch = (async (url: string, init: any) => {
    assert.equal(url, '/api/auth/login');
    assert.equal(init.method, 'POST');
    sentBody = JSON.parse(init.body);

    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        statusCode: 200,
        data: {
          access_token: 'mock_jwt_token',
          refresh_token: 'mock_refresh_token',
          user: { id: 10, email: 'admin@snapvocab.com' },
        },
      }),
    } as any;
  }) as any;

  try {
    const res = await loginApi({ email: 'admin@snapvocab.com', password: 'secretpassword' });
    assert.equal(sentBody.email, 'admin@snapvocab.com');
    assert.equal(sentBody.password, 'secretpassword');
    assert.equal(res.access_token, 'mock_jwt_token');
    assert.equal(res.refresh_token, 'mock_refresh_token');
    assert.equal(res.user.id, 10);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('8. loginApi - Error 401 maps to INVALID_CREDENTIALS with Vietnamese message', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: false,
    status: 401,
    headers: { get: () => 'application/json' },
    json: async () => ({ statusCode: 401, error: 'Bad credentials' }),
  })) as any;

  try {
    await assert.rejects(
      async () => {
        await loginApi({ email: 'wrong@test.com', password: 'wrong' });
      },
      (err: ApiClientError) => {
        assert.equal(err.statusCode, 401);
        assert.equal(err.code, 'INVALID_CREDENTIALS');
        assert.equal(err.message, 'Email hoặc mật khẩu không chính xác.');
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('9. loginApi - Error 403 USER_NOT_ACTIVATED maps to ACCOUNT_NOT_ACTIVATED', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: false,
    status: 403,
    headers: { get: () => 'application/json' },
    json: async () => ({ statusCode: 403, error: 'USER_NOT_ACTIVATED' }),
  })) as any;

  try {
    await assert.rejects(
      async () => {
        await loginApi({ email: 'pending@test.com', password: 'validpassword' });
      },
      (err: ApiClientError) => {
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, 'ACCOUNT_NOT_ACTIVATED');
        assert.equal(err.message, 'Tài khoản chưa được kích hoạt. Vui lòng liên hệ quản trị viên.');
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('10. refreshApi - Successfully rotates tokens via POST /api/auth/refresh', async () => {
  const originalFetch = globalThis.fetch;
  let sentBody: any = null;

  globalThis.fetch = (async (url: string, init: any) => {
    assert.equal(url, '/api/auth/refresh');
    sentBody = JSON.parse(init.body);

    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        statusCode: 200,
        data: {
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          user: { id: 10, email: 'admin@snapvocab.com' },
        },
      }),
    } as any;
  }) as any;

  try {
    const res = await refreshApi('old_refresh_token');
    assert.equal(sentBody.refreshToken, 'old_refresh_token');
    assert.equal(res.access_token, 'new_access_token');
    assert.equal(res.refresh_token, 'new_refresh_token');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('11. refreshApi - Failure throws REFRESH_TOKEN_EXPIRED error', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: false,
    status: 400,
    headers: { get: () => 'application/json' },
    json: async () => ({ statusCode: 400, error: 'Token expired' }),
  })) as any;

  try {
    await assert.rejects(
      async () => {
        await refreshApi('expired_token');
      },
      (err: ApiClientError) => {
        assert.equal(err.code, 'REFRESH_TOKEN_EXPIRED');
        assert.equal(err.message, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        return true;
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('12. apiClient - Injects Bearer token into Authorization header', async () => {
  mockLocalStorage.clear();
  setAuthToken('test_token_xyz');

  const originalFetch = globalThis.fetch;
  let capturedHeaders: any = null;

  globalThis.fetch = (async (_url: string, init: any) => {
    capturedHeaders = init.headers;
    return {
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ statusCode: 200, data: { success: true } }),
    } as any;
  }) as any;

  try {
    const result = await apiClient<{ success: boolean }>('/api/admin/test');
    assert.equal(capturedHeaders['Authorization'], 'Bearer test_token_xyz');
    assert.equal(result.success, true);
  } finally {
    globalThis.fetch = originalFetch;
    mockLocalStorage.clear();
  }
});

test('13. apiClient - Automatic token refresh on 401 and request retry', async () => {
  mockLocalStorage.clear();
  setAuthToken('expired_access_token');
  setRefreshToken('valid_refresh_token');

  const originalFetch = globalThis.fetch;
  let callCount = 0;

  globalThis.fetch = (async (url: string) => {
    callCount++;
    if (url === '/api/auth/refresh') {
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          statusCode: 200,
          data: {
            access_token: 'new_fresh_token',
            refresh_token: 'new_fresh_refresh',
          },
        }),
      } as any;
    }

    if (url === '/api/admin/data') {
      if (callCount === 1) {
        // First call fails with 401
        return {
          ok: false,
          status: 401,
          headers: { get: () => 'application/json' },
          json: async () => ({ statusCode: 401, error: 'Unauthorized' }),
        } as any;
      }
      // Second call (after retry) succeeds
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ statusCode: 200, data: { status: 'ok' } }),
      } as any;
    }

    throw new Error('Unexpected URL: ' + url);
  }) as any;

  try {
    const res = await apiClient<{ status: string }>('/api/admin/data');
    assert.equal(res.status, 'ok');
    assert.equal(getAuthToken(), 'new_fresh_token');
    assert.equal(getRefreshToken(), 'new_fresh_refresh');
  } finally {
    globalThis.fetch = originalFetch;
    mockLocalStorage.clear();
  }
});

test('14. apiClient - Refresh failure triggers onAuthExpired listener and clears storage', async () => {
  mockLocalStorage.clear();
  setAuthToken('expired_access_token');
  setRefreshToken('invalid_refresh_token');

  let expiredNotified = false;
  const unsubscribe = onAuthExpired(() => {
    expiredNotified = true;
  });

  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (url: string) => {
    if (url === '/api/auth/refresh') {
      return {
        ok: false,
        status: 400,
        headers: { get: () => 'application/json' },
        json: async () => ({ statusCode: 400, error: 'Invalid refresh token' }),
      } as any;
    }
    return {
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({ statusCode: 401, error: 'Unauthorized' }),
    } as any;
  }) as any;

  try {
    await assert.rejects(
      async () => {
        await apiClient('/api/admin/sensitive');
      },
      (err: ApiClientError) => {
        assert.equal(err.statusCode, 401);
        return true;
      },
    );

    assert.equal(expiredNotified, true);
    assert.equal(getAuthToken(), null);
    assert.equal(getRefreshToken(), null);
  } finally {
    unsubscribe();
    globalThis.fetch = originalFetch;
    mockLocalStorage.clear();
  }
});

test('15. Role Gatekeeping - Non-Admin accounts are blocked from Admin session', () => {
  // Simulate token returned for ROLE_USER
  const userToken = createMockJwt({
    sub: 'learner@snapvocab.com',
    auth: 'ROLE_USER',
    userId: 99,
  });

  const authorities = extractAuthorities(userToken);
  assert.equal(hasAdminAuthority(authorities), false);

  // Verification: non-admin must not be granted admin session
  const canAccessAdmin = hasAdminAuthority(authorities);
  assert.equal(canAccessAdmin, false, 'User with ROLE_USER must not have admin access');
});

test('16. Role Gatekeeping - Admin account is granted access', () => {
  const adminToken = createMockJwt({
    sub: 'admin@snapvocab.com',
    auth: 'ROLE_ADMIN',
    userId: 1,
  });

  const authorities = extractAuthorities(adminToken);
  assert.equal(hasAdminAuthority(authorities), true);
});

test('17. Form Validation - the login page validates email format and password presence', () => {
  // Valid input: nothing to report (surrounding spaces are trimmed before checking).
  assert.deepEqual(validateLogin('admin@snapvocab.com', 'x'), {});
  assert.deepEqual(validateLogin('  operator.lead@company.vn ', 'x'), {});

  // Invalid emails
  for (const email of ['admin', 'admin@', '@snapvocab.com', 'admin snapvocab.com']) {
    assert.equal(validateLogin(email, 'x').email, 'Email không đúng định dạng.', email);
  }
  assert.equal(validateLogin('   ', 'x').email, 'Nhập email.');

  // Password presence; both errors at once on an empty form.
  assert.deepEqual(validateLogin('admin@snapvocab.com', ''), { password: 'Nhập mật khẩu.' });
  assert.deepEqual(validateLogin('', ''), { email: 'Nhập email.', password: 'Nhập mật khẩu.' });
});
