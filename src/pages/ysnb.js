import React, { useEffect } from 'react';
import Layout from '@theme/Layout';

const TARGET_URL = 'https://cxsx.lanzouw.com/b00odr9omb';

export default function YSNBRedirect() {
  useEffect(() => {
    window.location.replace(TARGET_URL);
  }, []);

  return (
    <Layout title="跳转中..." description="正在跳转到下载页面">
      <div
        style={{
          minHeight: '50vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <p>正在跳转到下载页面...</p>
        <p>
          <a href={TARGET_URL}>{TARGET_URL}</a>
        </p>
      </div>
    </Layout>
  );
}
