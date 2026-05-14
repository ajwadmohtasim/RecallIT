import { Component } from 'react';
import { MarkdownHooks } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { createHighlighter } from 'shiki';

let highlighterPromise;
const SUPPORTED_LANGS = new Set([
  'plaintext',
  'text',
  'txt',
  'markdown',
  'md',
  'json',
  'bash',
  'sh',
  'shell',
  'javascript',
  'js',
  'typescript',
  'ts',
  'jsx',
  'tsx',
  'c',
  'cpp',
  'c++',
  'python',
  'py',
  'java',
]);

const sanitizeFencedLanguages = (raw = '') => {
  return raw.replace(/^```([^\s`]+)(.*)$/gm, (_match, lang, rest) => {
    const normalized = String(lang || '').toLowerCase();
    if (SUPPORTED_LANGS.has(normalized)) {
      return `\`\`\`${normalized}${rest || ''}`;
    }
    return `\`\`\`plaintext${rest || ''}`;
  });
};

const prettyCodeOptions = {
  theme: {
    light: 'github-light',
    dark: 'github-dark',
  },
  keepBackground: false,
  defaultLang: 'plaintext',
  getHighlighter: (options) => {
    if (!highlighterPromise) {
      highlighterPromise = createHighlighter({
        themes: options.themes || ['github-light', 'github-dark'],
        langs: [
          'plaintext',
          'markdown',
          'json',
          'bash',
          'javascript',
          'typescript',
          'jsx',
          'tsx',
          'c',
          'cpp',
          'python',
          'java',
        ],
      });
    }

    return highlighterPromise;
  },
};

class MarkdownErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('Markdown render failed, falling back to plain text.', error);
  }

  render() {
    if (this.state.hasError) {
      return <pre>{this.props.fallbackText}</pre>;
    }

    return this.props.children;
  }
}

const MarkdownRenderer = ({ content = '' }) => {
  const safeContent = sanitizeFencedLanguages(content);

  return (
    <MarkdownErrorBoundary fallbackText={content}>
      <div className="markdown-content">
        <MarkdownHooks
          fallback={<pre>{content}</pre>}
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeRaw, rehypeKatex, [rehypePrettyCode, prettyCodeOptions]]}
        >
          {safeContent}
        </MarkdownHooks>
      </div>
    </MarkdownErrorBoundary>
  );
};

export default MarkdownRenderer;
