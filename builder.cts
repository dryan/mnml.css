import * as browserslist from "browserslist";
import * as fs from "fs";
import * as config from "./package.json";
import * as postcss from "postcss";

const targetBrowsers = browserslist([
  "defaults",
  "not ie 11",
  "not op_mini all",
  "not dead",
]);

const browserNames: { [key: string]: string } = {
  and_chr: "Chrome (Android)",
  and_ff: "Firefox (Android)",
  and_qq: "QQ Browser (Android)",
  and_uc: "UC Browser (Android)",
  android: "Android Browser",
  baidu: "Baidu Browser",
  bb: "BlackBerry Browser",
  chrome: "Chrome",
  edge: "Edge",
  firefox: "Firefox",
  ie: "Internet Explorer",
  ie_mob: "Internet Explorer Mobile",
  ios_saf: "Safari (iOS & iPadOS)",
  kaios: "KaiOS Browser",
  op_mini: "Opera Mini",
  op_mob: "Opera Mobile",
  opera: "Opera",
  safari: "Safari (macOS)",
  samsung: "Samsung Internet",
};

const generateSupportMatrix = (): string => {
  // generates a markdown table of supported browsers and versions
  const supportedBrowserVersions: { [key: string]: string[] } = {};
  targetBrowsers.map((browser) => {
    const [browserName, browserVersion] = browser.split(" ");
    if (!supportedBrowserVersions[browserName])
      supportedBrowserVersions[browserName] = [];
    supportedBrowserVersions[browserName].push(browserVersion);
    supportedBrowserVersions[browserName] =
      supportedBrowserVersions[browserName].sort();
  });
  Object.entries(supportedBrowserVersions).map(
    ([browserName, browserVersions]) => {
      let versions: string[] = [];
      browserVersions.map((version) => {
        const [major, minor] = version.split(".");
        if (version.includes("-")) {
          versions = versions.concat(version.split("-"));
        } else {
          versions.push(minor === "0" ? major : version);
        }
        versions = versions.sort((a, b) => parseFloat(a) - parseFloat(b));
      });

      const handledVersions: string[] = [];
      versions = versions.reduce((acc, version, index) => {
        if (versions.length === 1) return acc.concat(version);
        if (handledVersions.includes(version)) return acc;
        const current = parseFloat(version);
        let i = 1;
        let next = parseFloat(versions[index + i]);
        let prev = index + 1;
        let diff = next ? Math.round((next - current) * 10) / 10 : 0;
        const diffThreshold = version.includes(".") ? 0.1 : 1;
        if (diff > diffThreshold) {
          handledVersions.push(version);
          return acc.concat(version);
        }
        while (true) {
          if (next) {
            handledVersions.push(versions[index + i]);
          }
          i++;
          next = parseFloat(versions[index + i]);
          diff = next ? Math.round((next - current) * 10) / 10 : 0;
          if (!next) {
            handledVersions.push(version);
            return acc.concat(`${version}-${versions[prev]}`);
          }
          prev++;
          if (prev > versions.length) {
            handledVersions.push(version);
            return acc.concat(`${version}-${versions[prev]}`);
          }
        }
      }, [] as string[]);

      supportedBrowserVersions[browserName] = versions;
    }
  );

  const longestBrowserName = Math.max(
    Object.keys(supportedBrowserVersions).reduce((acc, browserName) => {
      return (browserNames[browserName] ?? browserName).length > acc
        ? (browserNames[browserName] ?? browserName).length
        : acc;
    }, 0),
    "Browser".length
  );

  const longestBrowserVersions = Math.max(
    Object.values(supportedBrowserVersions).reduce((acc, browserVersions) => {
      return browserVersions.join("; ").length > acc
        ? browserVersions.join("; ").length
        : acc;
    }, 0),
    "Supported Versions".length
  );

  const tableHeader = `| ${"Browser".padEnd(
    longestBrowserName,
    " "
  )} | ${"Supported Versions".padEnd(longestBrowserVersions, " ")} |`;

  const padCenter = (
    str: string,
    length: number,
    pad: string = " "
  ): string => {
    const left = Math.floor((length - str.length) / 2);
    const right = length - str.length - left;
    return `${pad.repeat(left)}${str}${pad.repeat(right)}`;
  };

  const output: string[] = [
    `${padCenter("Support Matrix", tableHeader.length)}`,
    tableHeader,
    `| ${"-".repeat(longestBrowserName)} | ${"-".repeat(
      longestBrowserVersions
    )} |`,
  ];

  Object.keys(supportedBrowserVersions)
    .sort((a, b) => (browserNames[a] ?? a).localeCompare(browserNames[b] ?? b))
    .map((browser) => {
      const browserName = browserNames[browser] ?? browser;
      const browserVersions = supportedBrowserVersions[browser].join("; ");
      output.push(
        `| ${browserName.padEnd(
          longestBrowserName,
          " "
        )} | ${browserVersions.padEnd(longestBrowserVersions, " ")} |`
      );
    });

  return output.join("\n");
};

const generateMnml = async (minify: Boolean = true): Promise<string> => {
  const banner = `
/*
 * 🎨 mnml.css ${config.version}
${generateSupportMatrix()
  .split("\n")
  .map((line) => ` * ${line}`)
  .join("\n")}
 */`.trim();

  const preamble = `
/*
 * Inspirations
 * https://www.sarasoueidan.com/blog/focus-indicators/
 * https://css-tricks.com/notes-on-josh-comeaus-custom-css-reset/
 */`.trim();

  const layers = Object.fromEntries(
    fs.readdirSync("src/base").map((layer) => {
      const layerName = layer.replace(".css", "").split("_")[1];
      return [layerName, fs.readFileSync(`src/base/${layer}`)];
    })
  );

  const layerDeclaration = `@layer mnml, ${Object.keys(layers)
    .map((l) => `mnml.${l}`)
    .join(", ")}, mnml.utils;`;

  const base = `
${layerDeclaration}

@layer mnml {
  ${Object.entries(layers)
    .map(([layerName, layer]) => {
      return `
  @layer ${layerName} {
${layer.toString().trim()}
   } /* @layer ${layerName} */`.trim();
    })
    .join("\n\n")}
}

  `.trim();

  return processCss(base, [banner, preamble].join("\n\n"), minify);
};

const generateMnmlUtils = async (minify: Boolean = true): Promise<string> => {
  const banner = `
/*
 * 🎨 mnml-utils.css ${config.version}
 */`.trim();

  const utils = Object.fromEntries(
    fs.readdirSync("src/utils").map((util) => {
      const utilName = util.replace(".css", "").split("_")[1];
      return [utilName, fs.readFileSync(`src/utils/${util}`)];
    })
  );

  const base = `
 @layer mnml.utils {
  ${Object.entries(utils).map(([utilName, util]) => util.toString().trim())}
 } /* @layer mnml.utils */
`.trim();

  return processCss(base, banner, minify);
};

const processCss = async (
  css: string,
  banner: string = "",
  minify: Boolean = true
) => {
  const processor = new postcss.Processor(
    [
      require("postcss-nesting")(),
      minify
        ? require("cssnano")({ preset: ["default", { colormin: false }] })
        : false,
    ].filter((plugin) => plugin)
  );

  const processed = await processor.process(css, {
    from: undefined,
    map: false,
  });

  css = processed.css
    .toString()
    .replaceAll("\n", "")
    .replace(/var\(\s+/g, "var(")
    .replace(/\)\s+\)/g, "))");

  css = `
${banner}

${css}`.trim();

  if (!minify) {
    css = require("prettier").format(css, { parser: "css" });
  }

  return css;
};

(async () => {
  const minify = !process.argv.includes("--no-minify");
  const mnml = await generateMnml(minify);
  fs.mkdirSync("dist");
  fs.writeFileSync("dist/mnml.css", mnml);
  const mnmlUtils = await generateMnmlUtils(minify);
  fs.writeFileSync("dist/mnml-utils.css", mnmlUtils);
})();
