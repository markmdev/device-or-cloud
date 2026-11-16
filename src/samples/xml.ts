// Whether a browser can read a piece of SVG code as a picture: the code has to be well-formed XML. The check runs
// outside a browser too, where there is no parser to ask, so these are XML's own rules for the things a model gets
// wrong: tags that don't close or close in the wrong order, a bare "&" or "<", an attribute given twice or without
// quotes, a prefix such as xlink: that nothing declares, and text after the picture ends.

const NAME = "[A-Za-z_][\\w.\\-]*(?::[A-Za-z_][\\w.\\-]*)?";
const TAG = new RegExp(`^<(/?)(${NAME})((?:\\s+${NAME}\\s*=\\s*(?:"[^"<]*"|'[^'<]*'))*)\\s*(/?)>`);
const ATTRIBUTE = new RegExp(`(${NAME})\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "g");
const ENTITY = /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/;
const prefixOf = (name: string) => (name.includes(":") ? name.split(":")[0] : undefined);

/** What stops a browser from reading the code, in a few words, or undefined when it can. */
export function malformed(code: string): string | undefined {
  let rest = code.replace(/^﻿?\s*(<\?xml[^>]*\?>)?/, "");
  const open: { name: string; declared: Set<string> }[] = [];
  let rooted = false;
  while (rest) {
    if (rest.startsWith("<!--")) {
      const end = rest.indexOf("-->");
      if (end < 0) return "a comment never ends";
      if (rest.slice(4, end).includes("--")) return 'a comment holds "--"';
      rest = rest.slice(end + 3);
    } else if (rest.startsWith("<![CDATA[")) {
      const end = rest.indexOf("]]>");
      if (end < 0 || !open.length) return "a CDATA block is not closed, or is outside the picture";
      rest = rest.slice(end + 3);
    } else if (rest.startsWith("<?")) {
      const end = rest.indexOf("?>");
      if (end < 0) return "a processing instruction never ends";
      rest = rest.slice(end + 2);
    } else if (/^<!DOCTYPE[^>[]*>/.test(rest) && !rooted) {
      rest = rest.slice(rest.indexOf(">") + 1);
    } else if (rest[0] === "<") {
      const tag = TAG.exec(rest);
      if (!tag) return `a tag is broken: ${rest.slice(0, 40).replace(/\s+/g, " ")}`;
      const [whole, closing, name, attributes, empty] = tag;
      if (closing) {
        if (attributes || empty) return `the closing tag </${name}> holds more than its name`;
        if (open.at(-1)?.name !== name) return open.length ? `<${open.at(-1)!.name}> is closed by </${name}>` : `</${name}> closes nothing`;
        open.pop();
      } else {
        if (rooted && !open.length) return "there is a second picture after the first";
        rooted = true;
        const declared = new Set(open.at(-1)?.declared ?? ["xml"]), seen = new Set<string>(), used = [name];
        for (const [, attribute, double, single] of attributes.matchAll(ATTRIBUTE)) {
          if (seen.has(attribute)) return `<${name}> has the attribute ${attribute} twice`;
          seen.add(attribute);
          if (ENTITY.test(double ?? single)) return `an attribute of <${name}> holds a bare "&"`;
          if (attribute.startsWith("xmlns:")) declared.add(attribute.slice(6));
          else if (attribute !== "xmlns") used.push(attribute);
        }
        const unknown = used.map(prefixOf).find((prefix) => prefix && !declared.has(prefix));
        if (unknown) return `the prefix ${unknown}: is used and never declared`;
        if (!empty) open.push({ name, declared });
      }
      rest = rest.slice(whole.length);
    } else {
      const next = rest.indexOf("<"), text = next < 0 ? rest : rest.slice(0, next);
      if (!open.length && text.trim()) return rooted ? "there is text after the picture ends" : "there is text before the picture starts";
      if (ENTITY.test(text)) return 'the text holds a bare "&"';
      if (text.includes("]]>")) return 'the text holds "]]>"';
      rest = rest.slice(text.length);
    }
  }
  if (open.length) return `<${open.at(-1)!.name}> is never closed`;
  return rooted ? undefined : "there is no picture";
}
