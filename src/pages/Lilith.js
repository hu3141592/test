import React, { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './Lilith.css';

const emptyDraft = {
  title: '',
  content: '',
};

const PASSWORD_HASH_STORAGE_KEY = 'lilith_password_hash';
const POSTS_STORAGE_KEY = 'lilith_posts';
const DRAFT_STORAGE_KEY = 'lilith_draft';
const DRAFTS_STORAGE_KEY = 'lilith_drafts';
const AUTH_STORAGE_KEY = 'lilith_auth_unlocked';
const NEW_DRAFT_KEY = 'new';

const DEFAULT_PASSWORD_HASH = '3b1024eb5b3580d46d81ed9dd83f0eff527bdf28a205f9882d3c27951448f846';

function getConfiguredPasswordHash() {
  if (typeof window === 'undefined') {
    return DEFAULT_PASSWORD_HASH;
  }

  const savedHash = window.localStorage.getItem(PASSWORD_HASH_STORAGE_KEY);
  if (savedHash && savedHash.trim()) {
    return savedHash.trim();
  }

  return DEFAULT_PASSWORD_HASH;
}

function readStoredPosts() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(POSTS_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function writeStoredPosts(posts) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
}

function readStoredDraft() {
  if (typeof window === 'undefined') {
    return emptyDraft;
  }

  try {
    const stored = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : emptyDraft;
    return parsed && typeof parsed === 'object' ? parsed : emptyDraft;
  } catch (err) {
    return emptyDraft;
  }
}

function readStoredDrafts() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(DRAFTS_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    return {};
  }
}

function writeStoredDraft(draft) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

function writeStoredDrafts(drafts) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
}

async function sha256Hex(value) {
  const input = typeof value === 'string' ? value : '';
  const buffer = await window.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(input)
  );

  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function normalizeArticleIdentity(article) {
  return {
    title: String(article?.title || '').trim(),
    content: String(article?.content || '').trim(),
    created_at: String(article?.created_at || '').trim(),
  };
}

async function articleHashKey(article) {
  const payload = JSON.stringify(normalizeArticleIdentity(article));
  return sha256Hex(payload);
}

function sanitizeFileName(value) {
  const base = (value || 'untitled').trim().replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
  return base || 'untitled';
}

function previewText(content, maxLines = 3) {
  const normalized = String(content || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return '';
  }

  const lines = normalized.split('\n');
  if (lines.length <= maxLines) {
    return normalized;
  }

  return `${lines.slice(0, maxLines).join('\n')}\n......`;
}

async function buildExportFilename(post) {
  const baseTitle = sanitizeFileName(post.title || 'untitled');
  const identity = JSON.stringify(normalizeArticleIdentity(post));
  const fullHash = await sha256Hex(identity);
  const shortHash = fullHash.slice(0, 12).toLowerCase();

  return `${baseTitle}_${shortHash}.md`;
}

function formatDisplayTime(value) {
  const date = new Date(value || Date.now());
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1);
  const day = String(date.getDate());
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}/${month}/${day} - ${hours}:${minutes}:${seconds}`;
}

function sortPostsByCreatedAt(posts) {
  return [...posts].sort((a, b) => {
    const timeA = new Date(a?.created_at || 0).getTime();
    const timeB = new Date(b?.created_at || 0).getTime();
    return timeB - timeA;
  });
}

function markdownFromPost(post) {
  const title = (post.title || 'untitled').trim() || 'untitled';
  const content = (post.content || '').trim();
  const createdAt = post.created_at || new Date().toISOString();
  const updatedAt = post.updated_at || createdAt;

  return [
    '---',
    `title: "${title.replace(/"/g, '\\"') }"`,
    `created_at: "${createdAt}"`,
    `updated_at: "${updatedAt}"`,
    `published: true`,
    '---',
    '',
    `# ${title}`,
    '',
    content,
    '',
  ].join('\n');
}

function downloadBlob(filename, blob) {
  if (typeof window === 'undefined') {
    return;
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function parseMarkdownText(rawText, fallbackName) {
  const content = String(rawText || '').replace(/\r\n/g, '\n').trim();
  const defaultTitle = sanitizeFileName(fallbackName || 'untitled');

  if (!content) {
    return { title: defaultTitle, content: '', created_at: new Date().toISOString() };
  }

  let frontMatter = {};
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (frontMatterMatch) {
    const lines = frontMatterMatch[1].split('\n');
    lines.forEach((line) => {
      const match = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
      if (match) {
        frontMatter[match[1]] = match[2].replace(/^"|"$/g, '').replace(/\\"/g, '"');
      }
    });

    const remainder = frontMatterMatch[2].trim();
    const headingMatch = remainder.match(/^#\s+(.+?)\n+([\s\S]*)$/);
    if (headingMatch) {
      return {
        title: headingMatch[1].trim() || frontMatter.title || defaultTitle,
        content: headingMatch[2].trim(),
        created_at: frontMatter.created_at || new Date().toISOString(),
        updated_at: frontMatter.updated_at || frontMatter.created_at || new Date().toISOString(),
      };
    }

    return {
      title: frontMatter.title || defaultTitle,
      content: remainder,
      created_at: frontMatter.created_at || new Date().toISOString(),
      updated_at: frontMatter.updated_at || frontMatter.created_at || new Date().toISOString(),
    };
  }

  const headingMatch = content.match(/^#\s+(.+?)\n+([\s\S]*)$/);
  if (headingMatch) {
    return {
      title: headingMatch[1].trim() || defaultTitle,
      content: headingMatch[2].trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return { title: defaultTitle, content, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
}

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
  const [pageMode, setPageMode] = useState('view');
  const [editingPostId, setEditingPostId] = useState(null);
  const [activeDraftKey, setActiveDraftKey] = useState(NEW_DRAFT_KEY);
  const [drafts, setDrafts] = useState({});
  const [selectedPostIds, setSelectedPostIds] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [detailPostId, setDetailPostId] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const unlocked = window.sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true';
    const storedDrafts = readStoredDrafts();
    const fallbackDraft = readStoredDraft();

    setIsUnlocked(unlocked);
    setSessionPassword(unlocked ? 'stored' : '');
    setDrafts(storedDrafts);
    setDraft(storedDrafts[NEW_DRAFT_KEY] || fallbackDraft || emptyDraft);
    setPosts(sortPostsByCreatedAt(readStoredPosts()));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !isUnlocked) {
      return;
    }

    setDrafts((prevDrafts) => {
      const nextDrafts = { ...prevDrafts, [activeDraftKey]: draft };
      writeStoredDrafts(nextDrafts);
      return nextDrafts;
    });
  }, [draft, activeDraftKey, isUnlocked]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleDocumentPointerDown = (event) => {
      const menuButtons = document.querySelectorAll('.lilith-menu-button');
      const menus = document.querySelectorAll('.lilith-menu');
      const clickedMenuButton = Array.from(menuButtons).some((button) => button.contains(event.target));
      const clickedInsideMenu = Array.from(menus).some((menu) => menu.contains(event.target));

      if (!clickedMenuButton && !clickedInsideMenu) {
        menus.forEach((menu) => menu.classList.remove('lilith-menu-open'));
      }
    };

    document.addEventListener('mousedown', handleDocumentPointerDown);
    return () => document.removeEventListener('mousedown', handleDocumentPointerDown);
  }, []);

  const handleUnlock = async (event) => {
    event.preventDefault();
    setError('');
    setIsChecking(true);

    try {
      const expectedHash = getConfiguredPasswordHash();
      const inputHash = await sha256Hex(password);

      if (!expectedHash || expectedHash === 'REPLACE_WITH_SHA256_HASH') {
        throw new Error('请先在前端代码中填写密码哈希值');
      }

      if (inputHash !== expectedHash) {
        throw new Error('密码错误');
      }

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
      }

      setSessionPassword(password);
      setIsUnlocked(true);
      setPassword('');
      setPageMode('view');
      setSaveMessage('已解锁，默认显示查看页面');
    } catch (err) {
      setError(err.message || '验证失败');
    } finally {
      setIsChecking(false);
    }
  };

  const handleDraftSave = () => {
    setDrafts((prevDrafts) => {
      const nextDrafts = { ...prevDrafts, [activeDraftKey]: draft };
      writeStoredDrafts(nextDrafts);
      return nextDrafts;
    });
    setSaveMessage('草稿已保存到本地');
  };

  const openEditPage = (post = null) => {
    const nextDraftKey = post ? String(post.id) : NEW_DRAFT_KEY;

    setDrafts((prevDrafts) => {
      const nextDrafts = { ...prevDrafts, [activeDraftKey]: draft };
      writeStoredDrafts(nextDrafts);
      return nextDrafts;
    });

    setDetailPostId(null);

    if (post) {
      setEditingPostId(post.id);
      setDraft(drafts[String(post.id)] || { title: post.title, content: post.content });
    } else {
      setEditingPostId(null);
      setDraft(drafts[NEW_DRAFT_KEY] || emptyDraft);
    }

    setActiveDraftKey(nextDraftKey);
    setPageMode('edit');
    setSaveMessage('');
  };

  const handlePublish = async (event) => {
    event.preventDefault();
    setSaveMessage('');

    if (!draft.title.trim() || !draft.content.trim()) {
      setSaveMessage('标题和内容不能为空');
      return;
    }

    if (!sessionPassword) {
      setSaveMessage('请先输入正确密码');
      return;
    }

    setIsSaving(true);

    try {
      if (editingPostId !== null) {
        const nextPosts = sortPostsByCreatedAt(
          posts.map((post) =>
            post.id === editingPostId
              ? {
                  ...post,
                  title: draft.title.trim(),
                  content: draft.content.trim(),
                  updated_at: new Date().toISOString(),
                }
              : post
          )
        );
        writeStoredPosts(nextPosts);
        setPosts(nextPosts);
        setSaveMessage('文章已更新');
      } else {
        const nextPost = {
          id: Date.now(),
          title: draft.title.trim(),
          content: draft.content.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const nextPosts = sortPostsByCreatedAt([nextPost, ...posts]);
        writeStoredPosts(nextPosts);
        setPosts(nextPosts);
        setSaveMessage('内容已成功保存到本地');
      }

      setDrafts((prevDrafts) => {
        const nextDrafts = { ...prevDrafts };
        delete nextDrafts[activeDraftKey];
        writeStoredDrafts(nextDrafts);
        return nextDrafts;
      });

      setDraft(emptyDraft);
      setActiveDraftKey(NEW_DRAFT_KEY);
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      setEditingPostId(null);
      setPageMode('view');
    } catch (err) {
      setSaveMessage(err.message || '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePost = (id) => {
    if (typeof window !== 'undefined' && !window.confirm('确定要删除这篇文章吗？')) {
      return;
    }

    const nextPosts = sortPostsByCreatedAt(posts.filter((post) => post.id !== id));
    writeStoredPosts(nextPosts);
    setPosts(nextPosts);
    setSelectedPostIds((prev) => prev.filter((selectedId) => selectedId !== id));
    setSaveMessage('文章已删除');
  };

  const handleBatchDelete = () => {
    if (!selectedPostIds.length) {
      setSaveMessage('请先选择要删除的文章');
      return;
    }

    if (typeof window !== 'undefined' && !window.confirm(`确定要删除选中的 ${selectedPostIds.length} 篇文章吗？`)) {
      return;
    }

    const deletedCount = selectedPostIds.length;
    const nextPosts = sortPostsByCreatedAt(posts.filter((post) => !selectedPostIds.includes(post.id)));
    writeStoredPosts(nextPosts);
    setPosts(nextPosts);
    setSelectedPostIds([]);
    setIsSelectionMode(false);
    setSaveMessage(`已删除 ${deletedCount} 篇文章`);
  };

  const handleExportSinglePost = async (post) => {
    const markdown = markdownFromPost(post);
    const filename = await buildExportFilename(post);
    downloadBlob(filename, new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    setSaveMessage(`已导出：${filename}`);
  };

  const handleExportAllPosts = async () => {
    if (posts.length === 0) {
      setSaveMessage('当前没有可以导出的文章');
      return;
    }

    const zip = new JSZip();
    for (const post of posts) {
      const filename = await buildExportFilename(post);
      zip.file(filename, markdownFromPost(post));
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob('lilith-posts.zip', blob);
    setSaveMessage('已导出全部文章为 ZIP 压缩包');
  };

  const handleBulkExport = async () => {
    if (!selectedPostIds.length) {
      setSaveMessage('请先选择要导出的文章');
      return;
    }

    const selectedPosts = posts.filter((post) => selectedPostIds.includes(post.id));

    if (selectedPosts.length === 1) {
      handleExportSinglePost(selectedPosts[0]);
      setIsSelectionMode(false);
      setSelectedPostIds([]);
      return;
    }

    const zip = new JSZip();
    for (const post of selectedPosts) {
      const filename = await buildExportFilename(post);
      zip.file(filename, markdownFromPost(post));
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob('lilith-selected-posts.zip', blob);
    setIsSelectionMode(false);
    setSelectedPostIds([]);
    setSaveMessage(`已导出选中的 ${selectedPosts.length} 篇文章`);
  };

  const handleImportFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    try {
      const importedPosts = [];
      const existingPosts = readStoredPosts();
      const seenHashes = new Set();

      for (const post of existingPosts) {
        seenHashes.add(await articleHashKey(post));
      }

      for (const file of files) {
        const lowerName = file.name.toLowerCase();

        if (lowerName.endsWith('.zip')) {
          const zip = await JSZip.loadAsync(file);
          const markdownEntries = Object.values(zip.files).filter(
            (entry) => !entry.dir && ['.md', '.txt'].some((suffix) => entry.name.toLowerCase().endsWith(suffix))
          );

          for (const entry of markdownEntries) {
            const text = await entry.async('text');
            const fallbackName = entry.name.split('/').pop().replace(/\.(md|txt)$/i, '');
            const parsed = entry.name.toLowerCase().endsWith('.md')
              ? parseMarkdownText(text, fallbackName)
              : { title: sanitizeFileName(fallbackName || 'untitled'), content: text.trim(), created_at: new Date().toISOString() };
            const candidate = {
              id: Date.now() + Math.random(),
              title: parsed.title,
              content: parsed.content,
              created_at: parsed.created_at || new Date().toISOString(),
              updated_at: parsed.updated_at || parsed.created_at || new Date().toISOString(),
            };

            const hash = await articleHashKey(candidate);
            if (seenHashes.has(hash)) {
              continue;
            }

            seenHashes.add(hash);
            importedPosts.push(candidate);
          }
          continue;
        }

        if (lowerName.endsWith('.md') || lowerName.endsWith('.txt')) {
          const text = await file.text();
          const fallbackName = file.name.replace(/\.(md|txt)$/i, '');
          const parsed = lowerName.endsWith('.md')
            ? parseMarkdownText(text, fallbackName)
            : { title: sanitizeFileName(fallbackName || 'untitled'), content: text.trim(), created_at: new Date().toISOString() };
          const candidate = {
            id: Date.now() + Math.random(),
            title: parsed.title,
            content: parsed.content,
            created_at: parsed.created_at || new Date().toISOString(),
            updated_at: parsed.updated_at || parsed.created_at || new Date().toISOString(),
          };

          const hash = await articleHashKey(candidate);
          if (seenHashes.has(hash)) {
            continue;
          }

          seenHashes.add(hash);
          importedPosts.push(candidate);
        }
      }

      if (!importedPosts.length) {
        setSaveMessage('未找到可导入的新文章，或内容已重复');
        event.target.value = '';
        return;
      }

      const nextPosts = sortPostsByCreatedAt([...importedPosts, ...existingPosts]);
      writeStoredPosts(nextPosts);
      setPosts(nextPosts);
      setSaveMessage(`已导入 ${importedPosts.length} 篇文章`);
      event.target.value = '';
    } catch (err) {
      setSaveMessage(err.message || '导入失败');
      event.target.value = '';
    }
  };

  const handleClearPosts = () => {
    if (typeof window !== 'undefined' && window.confirm('确定要清空所有本地文章吗？')) {
      writeStoredPosts([]);
      setPosts([]);
      setSaveMessage('全部文章已清空');
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setSessionPassword('');
    setIsUnlocked(false);
    setPassword('');
    setError('');
    setPageMode('view');
    setSaveMessage('已退出');
  };

  const selectedPosts = posts.filter((post) => selectedPostIds.includes(post.id));
  const detailPost = posts.find((post) => post.id === detailPostId) || null;

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
          <div className="lilith-header-row">
            <div>
              <h1>Lilith</h1>
              <small>Independent Site</small>
            </div>

            <div className="lilith-header-actions">
              <div className="lilith-tab-bar">
                <button
                  type="button"
                  className={`lilith-tab-button ${pageMode === 'view' ? 'lilith-tab-button-active' : ''}`}
                  onClick={() => setPageMode('view')}
                >
                  查看
                </button>
                <button
                  type="button"
                  className={`lilith-tab-button ${pageMode === 'edit' ? 'lilith-tab-button-active' : ''}`}
                  onClick={() => openEditPage()}
                >
                  编辑
                </button>
              </div>

              <span className="lilith-status">本地存储已启用</span>
              <button type="button" className="lilith-ghost-button" onClick={handleLogout}>
                退出
              </button>
            </div>
          </div>
        </header>

        <main className="lilith-content">
          {detailPost ? (
            <section className="lilith-panel lilith-detail-panel">
              <div className="lilith-panel-header">
                <h2>{detailPost.title}</h2>
                <div className="lilith-detail-actions">
                  <button type="button" className="lilith-ghost-button" onClick={() => openEditPage(detailPost)}>
                    编辑
                  </button>
                  <button type="button" className="lilith-ghost-button" onClick={() => setDetailPostId(null)}>
                    返回列表
                  </button>
                </div>
              </div>

              <div className="lilith-detail-meta">
                <div>创建时间：{formatDisplayTime(detailPost.created_at)}</div>
                {detailPost.updated_at && detailPost.updated_at !== detailPost.created_at && (
                  <div>最近修改：{formatDisplayTime(detailPost.updated_at)}</div>
                )}
              </div>

              <article className="lilith-detail-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{detailPost.content}</ReactMarkdown>
              </article>
            </section>
          ) : pageMode === 'view' ? (
            <section className="lilith-panel lilith-list-panel">
              <div className="lilith-panel-header">
                <h2>已发布内容</h2>
                <div className="lilith-summary">
                  <span>{posts.length} 篇文章</span>
                  {posts.length > 0 && (
                    <button type="button" className="lilith-ghost-button" onClick={handleExportAllPosts}>
                      导出 ZIP
                    </button>
                  )}
                  <button
                    type="button"
                    className="lilith-ghost-button"
                    onClick={() => {
                      if (isSelectionMode) {
                        setIsSelectionMode(false);
                        setSelectedPostIds([]);
                        return;
                      }

                      setIsSelectionMode(true);
                    }}
                  >
                    批量操作
                  </button>
                  <button type="button" className="lilith-ghost-button" onClick={() => fileInputRef.current?.click()}>
                    导入
                  </button>
                </div>
              </div>

              {posts.length > 0 && isSelectionMode && (
                <div className="lilith-selection-tools">
                  <button
                    type="button"
                    className="lilith-ghost-button"
                    onClick={() => {
                      if (selectedPostIds.length === posts.length) {
                        setSelectedPostIds([]);
                      } else {
                        setSelectedPostIds(posts.map((post) => post.id));
                      }
                    }}
                  >
                    {selectedPostIds.length === posts.length ? '取消全选' : '全选'}
                  </button>
                  <button
                    type="button"
                    className="lilith-ghost-button"
                    onClick={handleBulkExport}
                    disabled={!selectedPostIds.length}
                  >
                    批量导出
                  </button>
                  <button
                    type="button"
                    className="lilith-ghost-button lilith-ghost-button-danger"
                    onClick={handleBatchDelete}
                    disabled={!selectedPostIds.length}
                  >
                    批量删除
                  </button>
                  {selectedPostIds.length > 0 && <span className="lilith-selection-count">已选 {selectedPostIds.length}</span>}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.zip"
                multiple
                hidden
                onChange={handleImportFiles}
              />

              {posts.length === 0 ? (
                <div className="lilith-empty-wrap">
                  <p className="lilith-empty-state">暂时还没有文章，先写下一篇吧。</p>
                  <button type="button" className="lilith-primary-button" onClick={() => openEditPage()}>
                    进入编辑器
                  </button>
                </div>
              ) : (
                <div className="lilith-posts">
                  {posts.map((post) => (
                    <article
                      key={post.id}
                      className={`lilith-post-item ${selectedPostIds.includes(post.id) ? 'lilith-post-item-selected' : ''}`}
                      onClick={() => setDetailPostId(post.id)}
                    >
                      <div className="lilith-post-header">
                        <div className="lilith-post-title-wrap">
                          {isSelectionMode && (
                            <input
                              type="checkbox"
                              checked={selectedPostIds.includes(post.id)}
                              onChange={(event) => {
                                event.stopPropagation();
                                setSelectedPostIds((prev) =>
                                  prev.includes(post.id)
                                    ? prev.filter((selectedId) => selectedId !== post.id)
                                    : [...prev, post.id]
                                );
                              }}
                              onClick={(event) => event.stopPropagation()}
                              aria-label={`选择文章：${post.title}`}
                              className="lilith-select-checkbox"
                            />
                          )}
                          <h3>{post.title}</h3>
                        </div>
                        <div className="lilith-post-actions" onClick={(event) => event.stopPropagation()}>
                          <div className="lilith-menu-wrap">
                            <button
                              type="button"
                              className="lilith-menu-button"
                              aria-label={`文章操作：${post.title}`}
                              onClick={() => {
                                const menu = document.getElementById(`menu-${post.id}`);
                                if (menu) {
                                  menu.classList.toggle('lilith-menu-open');
                                }
                              }}
                            >
                              ⋯
                            </button>

                            <div id={`menu-${post.id}`} className="lilith-menu">
                              <button
                                type="button"
                                className="lilith-menu-item"
                                onClick={() => {
                                  openEditPage(post);
                                  const menu = document.getElementById(`menu-${post.id}`);
                                  if (menu) {
                                    menu.classList.remove('lilith-menu-open');
                                  }
                                }}
                              >
                                编辑
                              </button>
                              <button
                                type="button"
                                className="lilith-menu-item"
                                onClick={() => {
                                  handleExportSinglePost(post);
                                  const menu = document.getElementById(`menu-${post.id}`);
                                  if (menu) {
                                    menu.classList.remove('lilith-menu-open');
                                  }
                                }}
                              >
                                导出 .md
                              </button>
                              <button
                                type="button"
                                className="lilith-menu-item lilith-menu-item-danger"
                                onClick={() => {
                                  handleDeletePost(post.id);
                                  const menu = document.getElementById(`menu-${post.id}`);
                                  if (menu) {
                                    menu.classList.remove('lilith-menu-open');
                                  }
                                }}
                              >
                                删除
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      <time>{formatDisplayTime(post.created_at)}</time>
                      <p className="lilith-post-preview">{previewText(post.content)}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="lilith-panel lilith-writer-panel">
              <div className="lilith-panel-header">
                <h2>{editingPostId !== null ? '编辑文章' : '新建文章'}</h2>
              </div>

              <form onSubmit={handlePublish} className="lilith-form">
                <label className="lilith-field">
                  <span>标题</span>
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                    placeholder="文章标题"
                    aria-label="文章标题"
                  />
                </label>

                <label className="lilith-field">
                  <span>正文</span>
                  <textarea
                    rows={12}
                    value={draft.content}
                    onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                    placeholder="写下你的内容..."
                    aria-label="文章内容"
                  />
                </label>

                <div className="lilith-form-actions">
                  <button type="button" className="lilith-secondary-button" onClick={handleDraftSave}>
                    保存草稿
                  </button>
                  <button type="submit" disabled={isSaving}>
                    {isSaving ? '保存中...' : editingPostId !== null ? '保存修改' : '发布到本地'}
                  </button>
                </div>

                {saveMessage && <div className="lilith-save-message">{saveMessage}</div>}
              </form>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
