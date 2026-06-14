export interface CssRule {
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

    const parts = selector.split(/[\s>+~]+/);

    for (const part of parts) {
      if (!part) continue;
      idCount += (part.match(/#/g) || []).length;
      classCount += (part.match(/\./g) || []).length;
      const withoutSelectors = part.replace(/#[\w-]+/g, '').replace(/\.[\w-]+/g, '').replace(/\[[\w-="'\s:]+\]/g, '');
      if (withoutSelectors && withoutSelectors !== '*') elementCount++;
    }

    return [idCount, classCount, elementCount];
  }

  matchSelector(selector: string, element: any): boolean {
    const parts = selector.split(/[\s>+~]+/);
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
    const tagMatch = remaining.match(/^[\w-]+/);
    if (tagMatch) {
      if (element.tag !== tagMatch[0]) return false;
      remaining = remaining.slice(tagMatch[0].length);
    }

    const classMatches = remaining.match(/\.[\w-]+/g) || [];
    const classes = (element.attributes?.class || '').split(/\s+/);
    for (const classSelector of classMatches) {
      const className = classSelector.slice(1);
      if (!classes.includes(className)) return false;
    }

    const idMatches = remaining.match(/#[\w-]+/g) || [];
    for (const idSelector of idMatches) {
      const idValue = idSelector.slice(1);
      if (element.attributes?.id !== idValue) return false;
    }

    return true;
  }
}