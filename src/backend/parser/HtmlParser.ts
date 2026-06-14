export interface DomNode {
  type: 'element' | 'text' | 'comment';
  tag?: string;
  text?: string;
  attributes?: Record<string, string>;
  children: DomNode[];
  parent?: DomNode;
}

type TokenType = 'text' | 'tag-open' | 'tag-close' | 'tag-self-close' | 'comment' | 'doctype';

interface Token {
  type: TokenType;
  value: string;
  attributes?: Record<string, string>;
}

export class HtmlParser {
  private selfClosingTags = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr'
  ]);

  parse(html: string): DomNode {
    const tokens = this.tokenize(html);
    const root: DomNode = { type: 'element', tag: 'html', children: [], attributes: {} };
    this.buildTree(tokens, root);
    return root;
  }

  private tokenize(html: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < html.length) {
      if (html[i] === '<') {
        if (html.slice(i, i + 4) === '<!--') {
          const endIdx = html.indexOf('-->', i);
          if (endIdx !== -1) {
            tokens.push({ type: 'comment', value: html.slice(i + 4, endIdx) });
            i = endIdx + 3;
            continue;
          }
        }

        if (html[i + 1] === '!') {
          const endIdx = html.indexOf('>', i);
          if (endIdx !== -1) {
            tokens.push({ type: 'doctype', value: html.slice(i, endIdx + 1) });
            i = endIdx + 1;
            continue;
          }
        }

        if (html[i + 1] === '/') {
          const endIdx = html.indexOf('>', i);
          if (endIdx !== -1) {
            const tagName = html.slice(i + 2, endIdx).trim().toLowerCase();
            tokens.push({ type: 'tag-close', value: tagName });
            i = endIdx + 1;
            continue;
          }
        }

        const endIdx = html.indexOf('>', i);
        if (endIdx !== -1) {
          const tagContent = html.slice(i + 1, endIdx);
          const isSelfClosing = tagContent.endsWith('/');
          const cleanContent = isSelfClosing ? tagContent.slice(0, -1) : tagContent;
          const parts = cleanContent.trim().split(/\s+/);
          const tagName = parts[0].toLowerCase();
          const attributes = this.parseAttributes(cleanContent);

          tokens.push({
            type: isSelfClosing || this.selfClosingTags.has(tagName) ? 'tag-self-close' : 'tag-open',
            value: tagName,
            attributes,
          });
          i = endIdx + 1;
          continue;
        }
      }

      const nextTag = html.indexOf('<', i + 1);
      const textEnd = nextTag === -1 ? html.length : nextTag;
      const text = html.slice(i, textEnd).trim();

      if (text) {
        tokens.push({ type: 'text', value: text });
      }

      i = textEnd;
    }

    return tokens;
  }

  private parseAttributes(tagContent: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    const regex = /(\w+)(?:=(?:"([^"]*)"|\'([^\']*)\'|(\S+)))?/g;
    let match;

    while ((match = regex.exec(tagContent)) !== null) {
      const key = match[1].toLowerCase();
      const value = match[2] || match[3] || match[4] || '';
      if (key !== tagContent.split(/\s+/)[0]) {
        attributes[key] = value;
      }
    }

    return attributes;
  }

  private buildTree(tokens: Token[], parent: DomNode): number {
    let i = 0;

    while (i < tokens.length) {
      const token = tokens[i];

      if (token.type === 'text') {
        parent.children.push({ type: 'text', text: token.value, children: [], parent });
        i++;
      } else if (token.type === 'tag-open') {
        const node: DomNode = {
          type: 'element',
          tag: token.value,
          attributes: token.attributes || {},
          children: [],
          parent,
        };
        parent.children.push(node);
        i = this.buildTree(tokens.slice(i + 1), node) + i + 1;
      } else if (token.type === 'tag-self-close') {
        const node: DomNode = {
          type: 'element',
          tag: token.value,
          attributes: token.attributes || {},
          children: [],
          parent,
        };
        parent.children.push(node);
        i++;
      } else if (token.type === 'tag-close') {
        if (token.value === parent.tag) return i;
        i++;
      } else {
        i++;
      }
    }

    return i;
  }
}