'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  hideSingleBullet?: boolean;
}

export default function MarkdownRenderer({ content, hideSingleBullet }: MarkdownRendererProps) {
  return (
    <div className="origin-markdown-content text-[15px] leading-relaxed text-[#374151]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-xl font-bold mt-5 mb-2.5 pb-2 border-b border-[#e5e7eb] text-[#111827]" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-[17px] font-semibold mt-4 mb-2 text-[#111827]" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-[15px] font-semibold mt-3 mb-1.5 text-[#111827]" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-[14px] font-semibold mt-2.5 mb-1 text-[#111827]" {...props} />
          ),
          p: ({ node, children, ...props }) => {
            const extractText = (nodes: any): string => {
              if (typeof nodes === 'string') return nodes;
              if (Array.isArray(nodes)) return nodes.map(extractText).join('');
              if (nodes?.props?.children) return extractText(nodes.props.children);
              return '';
            };
            const textContent = extractText(children);

            if (textContent.trim().startsWith('Sources:')) {
              const sourcesStr = textContent.replace('Sources:', '').replace(/\*\*/g, '').trim();
              let sourceItems: string[] = [];
              if (sourcesStr.includes('@')) {
                sourceItems = sourcesStr.split('@').map(s => s.trim().replace(/,$/, '')).filter(Boolean);
              } else {
                sourceItems = sourcesStr.split(',').map(s => s.trim()).filter(Boolean);
              }

              return (
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Sources</span>
                  <div className="flex flex-wrap gap-2 text-[12px] font-medium">
                    {sourceItems.map((src, i) => (
                      <span key={i} className="bg-[#2871fa]/10 px-2 py-0.5 rounded text-[#2871fa]">
                        @{src}
                      </span>
                    ))}
                  </div>
                </div>
              );
            }
            return <p className="my-2" {...props}>{children}</p>;
          },
          ul: ({ node, children, ...props }) => {
            if (hideSingleBullet) {
              const liChildren = React.Children.toArray(children).filter(
                (c): c is React.ReactElement => React.isValidElement(c) && (c as React.ReactElement<any>).type === 'li'
              );
              if (liChildren.length === 1) {
                return <p className="my-2">{(liChildren[0] as React.ReactElement<any>).props.children}</p>;
              }
            }
            return <ul className="my-2 space-y-1.5 pl-6 list-disc list-outside" {...props}>{children}</ul>;
          },
          ol: ({ node, ...props }) => (
            <ol className="my-2 space-y-1.5 pl-6 list-decimal list-outside" {...props} />
          ),
          li: ({ node, ...props }) => <li className="pl-1" {...props} />,
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-[#e5e7eb] shadow-sm">
              <table className="min-w-full text-sm" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-[#f9fafb] border-b border-[#e5e7eb]" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-[#e5e7eb]" {...props} />
          ),
          td: ({ node, ...props }) => <td className="px-4 py-2.5 whitespace-normal" {...props} />,
          tr: ({ node, ...props }) => (
            <tr className="hover:bg-[#f9fafb] transition-colors" {...props} />
          ),
          code: ({ node, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !className;
            if (isInline) {
              return (
                <code className="bg-[#f3f4f6] text-[#6111D1] px-[6px] py-[2px] rounded text-[0.88em] font-mono font-medium" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <div className="my-3 rounded-xl overflow-hidden border border-[#e5e7eb]">
                <div className="bg-[#f8fafc] px-4 py-1.5 text-[11px] font-mono text-[#6b7280] border-b border-[#e5e7eb]">
                  {match ? match[1] : 'code'}
                </div>
                <pre className="bg-[#fcfdfe] p-4 text-xs font-mono overflow-x-auto whitespace-pre leading-relaxed text-[#1e293b]">
                  <code className={className} {...props}>{children}</code>
                </pre>
              </div>
            );
          },
          strong: ({ node, ...props }) => <strong className="font-semibold text-[#111827]" {...props} />,
          a: ({ node, ...props }) => (
            <a className="text-[#2871fa] hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
