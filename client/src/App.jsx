import React from 'react';
import Dashboard from './Dashboard.jsx';

export default function App() {
  const path = window.location.pathname;
  const errors = {
    configuration: 'GitHub login has been misconfigured.',
    denied: 'Login was cancelled. please try again',
    github: 'Login failed. Please try again'
  };
  const error = errors[new URLSearchParams(window.location.search).get('error')];
  return <main>
    <header><h1>AI Capsule</h1><nav><a href="/">Home</a> | <a href="/dashboard">Dashboard</a></nav></header>
    {path === '/dashboard' ? <Dashboard /> : path === '/login' ? <>
      <h2>Log in</h2><p>Use your GitHub account to access your saved prompts.</p>
      {error && <p role="alert">{error}</p>}
      <a href="/api/auth/github/start">Log in with GitHub</a>
    </> : <>
      <h2>Save your useful AI prompts</h2>
      <p>Keep prompts, response summaries and notes in your own private library. Add, view, edit and delete your records.</p>
      <a href="/login">Log in with GitHub</a>
    </>}
  </main>;
}
