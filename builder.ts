import * as css from "@parcel/css";
import * as browserslist from "browserslist";
import * as fs from "fs";
import * as path from "path";
import * as config from "./package.json";

const targetBrowsers = browserslist(["defaults", "not ie 11", "not op_mini all"]);

const banner = `/*
 * 🎨 mnml.css ${config.version}
 * Supports: ${targetBrowsers.join(", ")}
 */
`;

const newLine = Buffer.from("\n");

interface BuildFilesOptions {
  filename: string;
  withOpenColors?: boolean;
}

const buildFiles = ({ filename, withOpenColors }: BuildFilesOptions): void => {
  if (!fs.existsSync("./dist")) {
    fs.mkdirSync("./dist");
  }
  let source = fs.readFileSync(`src/mnml.css`);
  if (withOpenColors) {
    source = Buffer.concat([
      source,
      newLine,
      fs.readFileSync(path.join("node_modules", "open-color", "open-color.css")),
    ]);
  }
  let { code, map } = css.transform({
    filename: filename,
    code: source,
    minify: true,
    sourceMap: true,
    targets: css.browserslistToTargets(targetBrowsers),
    drafts: {
      nesting: true,
      customMedia: true,
    },
  });
  if (map) {
    code = Buffer.concat([
      Buffer.from(banner),
      newLine,
      code,
      newLine,
      Buffer.from(`/*# sourceMappingURL=${filename}.map */`),
    ]);
    fs.writeFileSync(path.join("dist", `${filename}.map`), map);
  }
  fs.writeFileSync(path.join("dist", filename), code);
};

buildFiles({ filename: "mnml.css" });
buildFiles({ filename: "mnml-plus-opencolor.css", withOpenColors: true });
