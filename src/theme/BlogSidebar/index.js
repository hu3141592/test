import React, {useState, useRef, useEffect} from 'react';
import DocSidebar from '@theme/DocSidebar';
import BlogSidebarDesktop from '@theme/BlogSidebar/Desktop';
import BlogSidebarMobile from '@theme/BlogSidebar/Mobile';
import {useWindowSize} from '@docusaurus/theme-common';
import {useLayoutDocsSidebar} from '@docusaurus/plugin-content-docs/client';
import {useLocation} from '@docusaurus/router';
import fallbackTutorialSidebar from '@site/src/generated/tutorialSidebar';
import blogArchive from '@generated/docusaurus-plugin-content-blog/default/p/blog-archive-f05.json';
import ExpandButton from '@theme/DocRoot/Layout/Sidebar/ExpandButton';
import clsx from 'clsx';
import {ThemeClassNames} from '@docusaurus/theme-common';
import docSidebarStyles from '@docusaurus/theme-classic/src/theme/DocRoot/Layout/Sidebar/styles.module.css';

export default function BlogSidebar({sidebar}) {
  const windowSize = useWindowSize();
  const location = useLocation();
  // `hiddenContainer` controls the aside width (docSidebarContainerHidden class)
  // `hiddenSidebar` controls whether the inner sidebar content is hidden.
  const [hiddenContainer, setHiddenContainer] = useState(false);
  const [hiddenSidebar, setHiddenSidebar] = useState(false);
  
  // shared ref + absolute positioning state so footer collision works
  const asideRef = useRef(null);
  const [absoluteTop, setAbsoluteTop] = useState(null);

  // Prefer the docs `tutorialSidebar` by using the docs client hook which
  // resolves the correct sidebar across versions and contexts.
  let docsSidebar = null;
  try {
    docsSidebar = useLayoutDocsSidebar('tutorialSidebar');
  } catch (e) {
    // If the docs plugin or sidebar is not available, we'll fallback later.
    // Avoid spamming console in production.
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('BlogSidebar: tutorialSidebar not available:', e?.message || e);
    }
  }

  if (docsSidebar) {
    // `useLayoutDocsSidebar` may return either an array (sidebar items)
    // or an object with an `items` array depending on version metadata.
    const docsItems = Array.isArray(docsSidebar)
      ? docsSidebar
      : docsSidebar.items || null;
    const hasItems = docsItems && docsItems.length > 0;
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('BlogSidebar: tutorialSidebar found, hasItems=', !!hasItems);
    }
    if (hasItems) {
      const onCollapse = () => {
        // start container collapse animation
        setHiddenContainer(true);
      };

      const toggleExpand = () => {
        // expand: reveal content then expand container
        setHiddenSidebar(false);
        setHiddenContainer(false);
      };

      const content = (
        <>
          <DocSidebar
            className="blog-sidebar"
            sidebar={docsItems}
            path={location?.pathname}
            onCollapse={onCollapse}
            isHidden={hiddenSidebar}
          />
          {hiddenSidebar && <ExpandButton toggleSidebar={toggleExpand} />}
        </>
      );

  useEffect(() => {
    let rafId = null;
    function onScroll() {
      if (!asideRef.current) return;
      const footer = document.querySelector('footer');
      if (!footer) {
        if (absoluteTop !== null) setAbsoluteTop(null);
        return;
      }
      const asideRect = asideRef.current.getBoundingClientRect();
      const footerRect = footer.getBoundingClientRect();
      if (asideRect.bottom >= footerRect.top) {
        const top = window.scrollY + footerRect.top - asideRect.height;
        if (absoluteTop !== top) setAbsoluteTop(top);
      } else if (absoluteTop !== null) {
        setAbsoluteTop(null);
      }
    }
    function handler() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(onScroll);
    }
    window.addEventListener('scroll', handler, {passive: true});
    window.addEventListener('resize', handler);
    // run once
    handler();
    return () => {
      window.removeEventListener('scroll', handler);
      window.removeEventListener('resize', handler);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [absoluteTop]);

      return (
        <aside
          ref={asideRef}
          className={clsx(
            ThemeClassNames.docs.docSidebarContainer,
            docSidebarStyles.docSidebarContainer,
            hiddenContainer && docSidebarStyles.docSidebarContainerHidden,
          )}
          style={absoluteTop != null ? {position: 'absolute', top: absoluteTop + 'px', left: 0} : undefined}
          onTransitionEnd={(e) => {
            if (!e.currentTarget.classList.contains(docSidebarStyles.docSidebarContainer)) {
              return;
            }
            // after container transition ends, if it's hidden, hide inner sidebar
            if (hiddenContainer) {
              setHiddenSidebar(true);
            }
          }}>
          <div className={clsx(docSidebarStyles.sidebarViewport, hiddenSidebar && docSidebarStyles.sidebarViewportHidden)}>
            {content}
          </div>
        </aside>
      );
    }
  }

  // If we're on a blog page, build a blog-style sidebar (grouped by year/month)
  // but reuse the DocSidebar UI for appearance.
  if (location?.pathname?.startsWith('/blog')) {
    try {
      const posts = blogArchive?.archive?.blogPosts || [];
      if (posts.length > 0) {
        // group by year -> month
        const groups = {};
        posts.forEach((p) => {
          const date = new Date(p.metadata.date);
          const year = date.getFullYear();
          const month = date.toLocaleString(undefined, {month: 'long'});
          groups[year] = groups[year] || {};
          groups[year][month] = groups[year][month] || [];
          groups[year][month].push({
            type: 'link',
            href: p.metadata.permalink,
            label: p.metadata.title || p.metadata.permalink,
          });
        });

        const items = Object.keys(groups)
          .sort((a, b) => b - a)
          .map((year) => ({
            type: 'category',
            label: String(year),
            collapsible: true,
            collapsed: false,
            items: Object.keys(groups[year])
              .map((month) => ({
                type: 'category',
                label: month,
                collapsible: true,
                collapsed: true,
                items: groups[year][month],
              })),
          }));

        const onCollapse = () => setHiddenContainer(true);
        const toggleExpand = () => {
          setHiddenSidebar(false);
          setHiddenContainer(false);
        };

        const content = (
          <>
            <DocSidebar
              className="blog-sidebar"
              sidebar={items}
              path={location?.pathname}
              onCollapse={onCollapse}
              isHidden={hiddenSidebar}
            />
            {hiddenSidebar && <ExpandButton toggleSidebar={toggleExpand} />}
          </>
        );

        return (
          <aside
            ref={asideRef}
            style={absoluteTop != null ? {position: 'absolute', top: absoluteTop + 'px', left: 0} : undefined}
            className={clsx(
              ThemeClassNames.docs.docSidebarContainer,
              docSidebarStyles.docSidebarContainer,
              hiddenContainer && docSidebarStyles.docSidebarContainerHidden,
            )}
            onTransitionEnd={(e) => {
              if (!e.currentTarget.classList.contains(docSidebarStyles.docSidebarContainer)) {
                return;
              }
              if (hiddenContainer) {
                setHiddenSidebar(true);
              }
            }}>
            <div className={clsx(docSidebarStyles.sidebarViewport, hiddenSidebar && docSidebarStyles.sidebarViewportHidden)}>
              {content}
            </div>
          </aside>
        );
      }
    } catch (e) {
      // ignore and continue to docs sidebar fallback
    }
  }

  // If the layout hook didn't expose items (some pages don't provide full
  // sidebar metadata), fall back to our generated sidebar so the blog can
  // reuse the docs sidebar structure and styling.
  if (fallbackTutorialSidebar && fallbackTutorialSidebar.length > 0) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.debug('BlogSidebar: using fallback tutorialSidebar with', fallbackTutorialSidebar.length, 'items');
    }
    const onCollapse = () => setHiddenContainer(true);
    const toggleExpand = () => {
      setHiddenSidebar(false);
      setHiddenContainer(false);
    };

    const content = (
      <>
        <DocSidebar
          className="blog-sidebar"
          sidebar={fallbackTutorialSidebar}
          path={location?.pathname}
          onCollapse={onCollapse}
          isHidden={hiddenSidebar}
        />
        {hiddenSidebar && <ExpandButton toggleSidebar={toggleExpand} />}
      </>
    );

    return (
      <aside
        ref={asideRef}
        style={absoluteTop != null ? {position: 'absolute', top: absoluteTop + 'px', left: 0} : undefined}
        className={clsx(
          ThemeClassNames.docs.docSidebarContainer,
          docSidebarStyles.docSidebarContainer,
          hiddenContainer && docSidebarStyles.docSidebarContainerHidden,
        )}
        onTransitionEnd={(e) => {
          if (!e.currentTarget.classList.contains(docSidebarStyles.docSidebarContainer)) {
            return;
          }
          if (hiddenContainer) {
            setHiddenSidebar(true);
          }
        }}>
        <div className={clsx(docSidebarStyles.sidebarViewport, hiddenSidebar && docSidebarStyles.sidebarViewportHidden)}>
          {content}
        </div>
      </aside>
    );
  }

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('BlogSidebar: tutorialSidebar not used, falling back to blog sidebar');
  }

  // Fallback to the original blog sidebar behavior
  if (!sidebar?.items?.length) {
    return null;
  }
  if (windowSize === 'mobile') {
    return <BlogSidebarMobile sidebar={sidebar} />;
  }
  return <BlogSidebarDesktop sidebar={sidebar} />;
}