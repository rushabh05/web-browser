const fs = require('fs');
const path = require('path');

// HTML Parser
const htmlParser = `export interface DomNode {
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
          const parts = cleanContent.trim().split(/\\s+/);
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
    const regex = /(\\w+)(?:=(?:"([^"]*)"|\\'([^\\']*)\\'|(\\S+)))?/g;
    let match;

    while ((match = regex.exec(tagContent)) !== null) {
      const key = match[1].toLowerCase();
      const value = match[2] || match[3] || match[4] || '';
      if (key !== tagContent.split(/\\s+/)[0]) {
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
}`;

// CSS Parser
const cssParser = `export interface CssRule {
  selectors: string[];
  declarations: Record<string, string>;
  specificity: [number, number, number];
}

export interface StyleSheet {
  rules: CssRule[];
}

export class CssParser {
  parse(css: string): StyleSheet {
    const rules: CssRule[] = [];
    const ruleBlocks = this.extractRuleBlocks(css);

    for (const block of ruleBlocks) {
      const { selectors, declarations } = block;
      if (selectors.length > 0) {
        rules.push({
          selectors,
          declarations,
          specificity: this.calculateSpecificity(selectors[0]),
        });
      }
    }

    return { rules };
  }

  private extractRuleBlocks(css: string) {
    const blocks = [];
    let i = 0;

    while (i < css.length) {
      const braceStart = css.indexOf('{', i);
      if (braceStart === -1) break;

      const selectorText = css.slice(i, braceStart).trim();
      const braceEnd = css.indexOf('}', braceStart);
      if (braceEnd === -1) break;

      const declarationText = css.slice(braceStart + 1, braceEnd);
      const selectors = selectorText.split(',').map((s) => s.trim());
      const declarations = this.parseDeclarations(declarationText);

      blocks.push({ selectors, declarations });
      i = braceEnd + 1;
    }

    return blocks;
  }

  private parseDeclarations(declarationText: string): Record<string, string> {
    const declarations: Record<string, string> = {};
    const properties = declarationText.split(';');

    for (const prop of properties) {
      const colonIdx = prop.indexOf(':');
      if (colonIdx > 0) {
        const property = prop.slice(0, colonIdx).trim().toLowerCase();
        const value = prop.slice(colonIdx + 1).trim();
        if (property && value) {
          declarations[property] = value;
        }
      }
    }

    return declarations;
  }

  private calculateSpecificity(selector: string): [number, number, number] {
    let idCount = 0;
    let classCount = 0;
    let elementCount = 0;

    const parts = selector.split(/[\\s>+~]+/);

    for (const part of parts) {
      if (!part) continue;
      idCount += (part.match(/#/g) || []).length;
      classCount += (part.match(/\\./g) || []).length;
      const withoutSelectors = part.replace(/#[\\w-]+/g, '').replace(/\\.[\\w-]+/g, '').replace(/\\[[\\w-="'\\s:]+\\]/g, '');
      if (withoutSelectors && withoutSelectors !== '*') elementCount++;
    }

    return [idCount, classCount, elementCount];
  }

  matchSelector(selector: string, element: any): boolean {
    const parts = selector.split(/[\\s>+~]+/);
    let currentElement = element;

    for (let i = parts.length - 1; i >= 0; i--) {
      if (!this.matchSimpleSelector(parts[i], currentElement)) return false;
      currentElement = currentElement.parent;
      if (!currentElement) break;
    }

    return true;
  }

  private matchSimpleSelector(selector: string, element: any): boolean {
    if (!element || element.type !== 'element') return false;
    if (selector === '*') return true;

    let remaining = selector;
    const tagMatch = remaining.match(/^[\\w-]+/);
    if (tagMatch) {
      if (element.tag !== tagMatch[0]) return false;
      remaining = remaining.slice(tagMatch[0].length);
    }

    const classMatches = remaining.match(/\\.[\\w-]+/g) || [];
    const classes = (element.attributes?.class || '').split(/\\s+/);
    for (const classSelector of classMatches) {
      const className = classSelector.slice(1);
      if (!classes.includes(className)) return false;
    }

    const idMatches = remaining.match(/#[\\w-]+/g) || [];
    for (const idSelector of idMatches) {
      const idValue = idSelector.slice(1);
      if (element.attributes?.id !== idValue) return false;
    }

    return true;
  }
}`;

fs.writeFileSync('src/backend/parser/HtmlParser.ts', htmlParser);
fs.writeFileSync('src/backend/layout/CssParser.ts', cssParser);

console.log('✓ Generated HtmlParser');
console.log('✓ Generated CssParser');
