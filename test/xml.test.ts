// Each code with what Chrome's own XML parser said of it on 16 November 2026 (DOMParser, image/svg+xml).
import assert from "node:assert/strict";
import test from "node:test";
import { malformed } from "../src/samples/xml";

const SVG = '<svg xmlns="http://www.w3.org/2000/svg"';
const cases: ["fine" | "broken", string][] = [
  ["fine", "<svg viewBox=\"0 0 8 6\"><rect width=\"8\" height=\"6\"/></svg>"],
  ["broken", "<svg><g><rect/></svg>"],
  ["broken", "<svg><rect></svg>"],
  ["broken", "<svg><text>Fish & chips</text></svg>"],
  ["fine", "<svg><text>Fish &amp; chips &#169; &#xA9;</text></svg>"],
  ["broken", "<svg><text>a &nbsp; b</text></svg>"],
  ["broken", "<svg><use xlink:href=\"#a\"/></svg>"],
  ["fine", "<svg xmlns:xlink=\"http://www.w3.org/1999/xlink\"><g><use xlink:href=\"#a\"/></g></svg>"],
  ["broken", "<svg><rect width=8/></svg>"],
  ["broken", "<svg><rect width=\"8\" width=\"9\"/></svg>"],
  ["broken", "<svg><!-- a -- b --><rect/></svg>"],
  ["fine", "<svg><!-- fine --><rect/></svg>"],
  ["fine", "<svg><style>.a > .b { fill: red }</style></svg>"],
  ["broken", "<svg><style>.a { content: \"<\" }</style></svg>"],
  ["fine", "<svg><style><![CDATA[ .a { content: \"<&\" } ]]></style></svg>"],
  ["broken", "<svg><rect/></svg> and that is it"],
  ["broken", "<svg><rect/></svg><svg></svg>"],
  ["fine", "<svg><path d=\"M0 0 L5 5\"></path><circle r=\"2\" /></svg>"],
  ["fine", "<svg><text x='1'>it's</text></svg>"],
  ["broken", "<svg><text>5 < 6</text></svg>"],
  ["broken", "<svg><rect fill=\"a&b\"/></svg>"],
  ["fine", "<svg><Rect/></svg>"],
  ["broken", "<svg><rect/></SVG>"],
  ["broken", "<svg><g></g></g></svg>"],
  ["fine", "<svg><text xml:space=\"preserve\"> a </text></svg>"],
  ["fine", "<svg><rect\n  width=\"8\"\n  height=\"6\"\n/></svg>"],
  ["broken", "<svg><text>a ]]> b</text></svg>"],
  ["fine", "<svg><a href=\"x\"><rect/></a></svg>"],
  ["broken", "<svg><svg:rect/></svg>"],
  ["fine", "<svg><rect width = \"8\" /></svg>"],
  ["broken", "<svg><rect width=\"8\"height=\"6\"/></svg>"],
  ["broken", "<svg><1rect/></svg>"],
  ["fine", "<svg></svg>"],
  ["fine", "<svg/>"],
  ["fine", "<svg><text>&lt;b&gt;</text></svg>"],
];

for (const [said, code] of cases) {
  test(`a browser finds this ${said}: ${code}`, () => {
    assert.equal(malformed(code.replace(/^<svg/, SVG)) === undefined, said === "fine");
  });
}
