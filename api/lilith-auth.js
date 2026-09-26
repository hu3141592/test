import crypto from 'node:crypto';

const ADMIN_PASSWORD_HASH = process.env.LILITH_PASSWORD_HASH || '';

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = request.body || {};

  if (!password || typeof password !== 'string') {
    return response.status(400).json({ error: '缺少密码' });
  }

  if (!ADMIN_PASSWORD_HASH) {
    return response.status(500).json({ error: '服务未配置密码哈希' });
  }

  if (sha256Hex(password) !== ADMIN_PASSWORD_HASH) {
    return response.status(401).json({ error: '密码错误' });
  }

  return response.status(200).json({ ok: true });
}
