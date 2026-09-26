import crypto from 'node:crypto';
import { kv } from '@vercel/kv';

const ADMIN_PASSWORD_HASH = process.env.LILITH_PASSWORD_HASH || '';

export default async function handler(request, response) {
  if (request.method === 'GET') {
    try {
      const posts = (await kv.lrange('lilith-posts', 0, -1)) || [];
      return response.status(200).json({ posts });
    } catch (error) {
      return response.status(500).json({ error: '无法读取云端内容' });
    }
  }

  if (request.method === 'POST') {
    const { password, title, content } = request.body || {};

    if (!password || !title || !content) {
      return response.status(400).json({ error: '缺少必要字段' });
    }

    if (!ADMIN_PASSWORD_HASH) {
      return response.status(500).json({ error: '服务未配置密码哈希' });
    }

    const submittedHash = crypto
      .createHash('sha256')
      .update(password)
      .digest('hex');

    if (submittedHash !== ADMIN_PASSWORD_HASH) {
      return response.status(401).json({ error: '密码错误' });
    }

    try {
      const post = {
        id: Date.now().toString(),
        title: String(title).trim(),
        content: String(content).trim(),
        created_at: new Date().toISOString(),
      };

      await kv.lpush('lilith-posts', JSON.stringify(post));
      return response.status(200).json({ ok: true, post });
    } catch (error) {
      return response.status(500).json({ error: '写入云端失败' });
    }
  }

  return response.status(405).json({ error: 'Method not allowed' });
}
