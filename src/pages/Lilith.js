import React, { useEffect, useState } from 'react';
import './Lilith.css';

const emptyDraft = {
  title: '',
  content: '',
};

export default function LilithPage() {
  const [password, setPassword] = useState('');
  const [sessionPassword, setSessionPassword] = useState('');
  const [error, setError] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [posts, setPosts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const loadPosts = async () => {
    try {
      const response = await fetch('/api/posts');
      if (!response.ok) {
        return;
      }
      const result = await response.json();
      setPosts(result.posts || []);
    } catch (err) {
      // Ignore in preview mode when backend is not deployed yet.
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      loadPosts();
    }
  }, [isUnlocked]);

  const handleUnlock = async (event) => {
    event.preventDefault();
    setError('');
    setIsChecking(true);

    try {
      const response = await fetch('/api/lilith-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || '密码错误');
      }

      setSessionPassword(password);
      setIsUnlocked(true);
      setPassword('');
    } catch (err) {
      setError(err.message || '验证失败');
    } finally {
      setIsChecking(false);
    }
  };

  const handlePublish = async (event) => {
    event.preventDefault();
    setSaveMessage('');

    if (!draft.title.trim() || !draft.content.trim()) {
      setSaveMessage('标题和内容不能为空');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: sessionPassword,
          title: draft.title.trim(),
          content: draft.content.trim(),
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || '发送失败');
      }

      setDraft(emptyDraft);
      setSaveMessage('内容已成功发布到云端');
      await loadPosts();
    } catch (err) {
      setSaveMessage(err.message || '发布失败');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="lilith-lock-page">
        <form className="lilith-lock-card" onSubmit={handleUnlock}>
          <p className="lilith-lock-label">Lilith Access</p>
          <h1>请输入密码</h1>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete="off"
            aria-label="密码输入"
          />
          {error && <div className="lilith-lock-error">{error}</div>}
          <button type="submit" disabled={isChecking || !password.trim()}>
            {isChecking ? '验证中...' : '进入'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="lilith-page">
      <div className="lilith-shell">
        <header className="lilith-header">
          <h1>Lilith</h1>
          <small>Independent Site</small>
        </header>

        <main className="lilith-content">
          <section className="lilith-panel lilith-writer-panel">
            <h2>新建文章</h2>
            <form onSubmit={handlePublish} className="lilith-form">
              <input
                type="text"
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                placeholder="文章标题"
                aria-label="文章标题"
              />
              <textarea
                rows={8}
                value={draft.content}
                onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                placeholder="写下你的内容..."
                aria-label="文章内容"
              />
              <div className="lilith-form-actions">
                <button type="submit" disabled={isSaving}>
                  {isSaving ? '保存中...' : '发布到云端'}
                </button>
              </div>
              {saveMessage && <div className="lilith-save-message">{saveMessage}</div>}
            </form>
          </section>

          <section className="lilith-panel lilith-list-panel">
            <h2>已发布内容</h2>
            {posts.length === 0 ? (
              <p className="lilith-empty-state">暂时还没有文章，先写下一篇吧。</p>
            ) : (
              <div className="lilith-posts">
                {posts.map((post) => (
                  <article key={post.id} className="lilith-post-item">
                    <h3>{post.title}</h3>
                    <time>{new Date(post.created_at).toLocaleString()}</time>
                    <p>{post.content}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
