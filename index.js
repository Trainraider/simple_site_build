#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const commander = require('commander');
const { minify: htmlMinify } = require('html-minifier');
const UglifyJS = require('uglify-js');
const csso = require('csso');
const MarkdownIt = require('markdown-it');

function processContent(content, depth = 0, minify = false, usedFiles = new Set()) {
  if (depth > 10) {
    console.log("Maximum recursion depth reached");
    return content;
  }

  function replacePlaceholders(content, startComment, endComment) {
    let result = [];
    let idx = 0;
    while (idx < content.length) {
      let startIdx = content.indexOf(startComment, idx);
      if (startIdx === -1) {
        result.push(content.slice(idx));
        break;
      }
      let endIdx = content.indexOf(endComment, startIdx);
      if (endIdx === -1) {
        result.push(content.slice(idx));
        break;
      }
      result.push(content.slice(idx, startIdx));
      let commentContent = content.slice(startIdx + startComment.length, endIdx).trim();
      if (commentContent.startsWith('inject "') && commentContent.endsWith('" here')) {
        let filenamePattern = commentContent.slice('inject "'.length, -'" here'.length).trim();
        let injectedContent = injectContent(filenamePattern, depth, minify, usedFiles);
        result.push(injectedContent);
      } else {
        result.push(content.slice(startIdx, endIdx + endComment.length));
      }
      idx = endIdx + endComment.length;
    }
    return result.join('');
  }

  content = replacePlaceholders(content, '<!--', '-->');
  content = replacePlaceholders(content, '/*', '*/');
  content = replaceMarkdownPlaceholders(content, depth, minify, usedFiles);

  return content;
}

function replaceMarkdownPlaceholders(content, depth, minify, usedFiles) {
  let result = [];
  let idx = 0;
  while (idx < content.length) {
    let startIdx = content.indexOf('[//]: # (', idx);
    if (startIdx === -1) {
      result.push(content.slice(idx));
      break;
    }
    let endIdx = content.indexOf(')', startIdx);
    if (endIdx === -1) {
      result.push(content.slice(idx));
      break;
    }
    result.push(content.slice(idx, startIdx));
    let commentContent = content.slice(startIdx + '[//]: # ('.length, endIdx).trim();
    if (commentContent.startsWith('inject "') && commentContent.endsWith('" here')) {
      let filenamePattern = commentContent.slice('inject "'.length, -'" here'.length).trim();
      let injectedContent = injectContent(filenamePattern, depth, minify, usedFiles);
      result.push(injectedContent);
    } else {
      result.push(content.slice(startIdx, endIdx + 1));
    }
    idx = endIdx + 1;
  }
  return result.join('');
}

function injectContent(filenamePattern, depth, minify, usedFiles) {
  let matchedFiles = glob.sync(path.normalize(filenamePattern));
  matchedFiles.sort();
  if (!matchedFiles.length) {
    console.log(`No files matched the pattern ${filenamePattern}`);
    return '';
  }

  let injectedContent = [];
  for (let filepath of matchedFiles) {
    if (!fs.existsSync(filepath) || !fs.lstatSync(filepath).isFile()) {
      console.log(`${filepath} is not a file`);
      continue;
    }
    usedFiles.add(filepath);
    let fileExt = path.extname(filepath).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(fileExt)) {
      injectedContent.push(injectImage(filepath));
    } else if (fileExt === '.svg') {
      let svgContent = injectSvg(filepath, depth, minify, usedFiles);
      injectedContent.push(svgContent);
    } else if (fileExt === '.md') {
      let mdContent = injectMarkdown(filepath, depth, minify, usedFiles);
      injectedContent.push(mdContent);
    } else {
      let textContent = injectText(filepath, depth, minify, usedFiles);
      injectedContent.push(textContent);
    }
  }

  return injectedContent.join('\n');
}

function injectImage(filepath) {
  let imageData = fs.readFileSync(filepath);
  let base64Data = imageData.toString('base64');
  let mimeType = getMimeType(filepath);
  let dataUri = `data:${mimeType};base64,${base64Data}`;
  return `<img src="${dataUri}" alt="${path.basename(filepath)}">`;
}

function injectSvg(filepath, depth, minify, usedFiles) {
  let svgContent = fs.readFileSync(filepath, 'utf8');
  let processedContent = processContent(svgContent, depth + 1, minify, usedFiles);
  if (minify) {
    processedContent = htmlMinify(processedContent, { collapseWhitespace: true, removeComments: true });
  }
  return processedContent;
}

function injectMarkdown(filepath, depth, minify, usedFiles) {
  let mdContent = fs.readFileSync(filepath, 'utf8');

  // First, process any placeholders in the Markdown content
  let processedMdContent = processContent(mdContent, depth + 1, minify, usedFiles);

  // Now, render the Markdown to HTML, allowing raw HTML tags
  let md = new MarkdownIt({ html: true });
  let htmlContent = md.render(processedMdContent);

  if (minify) {
    htmlContent = htmlMinify(htmlContent, { collapseWhitespace: true, removeComments: true });
  }

  return htmlContent;
}

function injectText(filepath, depth, minify, usedFiles) {
  let fileContent = fs.readFileSync(filepath, 'utf8');
  let processedContent = processContent(fileContent, depth + 1, minify, usedFiles);
  let fileExt = path.extname(filepath).toLowerCase();
  if (minify) {
    if (fileExt === '.js') {
      let minified = UglifyJS.minify(processedContent);
      if (minified.error) {
        console.error(`Error minifying JS file ${filepath}:`, minified.error);
      } else {
        processedContent = minified.code;
      }
    } else if (fileExt === '.css') {
      processedContent = csso.minify(processedContent).css;
    } else if (fileExt === '.html') {
      processedContent = htmlMinify(processedContent, { collapseWhitespace: true, removeComments: true });
    }
  }
  return processedContent;
}

function getMimeType(filepath) {
  let mimeTypes = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
    '.gif': 'image/gif', '.bmp': 'image/bmp', '.webp': 'image/webp'
  };
  return mimeTypes[path.extname(filepath).toLowerCase()] || 'application/octet-stream';
}

function findUnusedFiles(srcDir, usedFiles) {
  let allFiles = new Set();
  function walkDir(dir) {
    fs.readdirSync(dir).forEach(file => {
      let filepath = path.join(dir, file);
      if (fs.lstatSync(filepath).isDirectory()) {
        walkDir(filepath);
      } else {
        allFiles.add(filepath);
      }
    });
  }
  walkDir(srcDir);
  let unusedFiles = new Set([...allFiles].filter(f => !usedFiles.has(f)));
  return unusedFiles;
}

function main() {
  const program = new commander.Command();
  program
    .option('--minify', 'Enable minification')
    .parse(process.argv);

  const options = program.opts();

  const inputFilePath = path.join('src', 'index.html');
  const outputDir = path.join('docs');
  const outputFilePath = path.join(outputDir, 'index.html');

  fs.mkdirSync(outputDir, { recursive: true });

  try {
    let content = fs.readFileSync(inputFilePath, 'utf8');
    let usedFiles = new Set();
    usedFiles.add(inputFilePath);

    let processedContent = processContent(content, 0, options.minify, usedFiles);
    fs.writeFileSync(outputFilePath, processedContent, 'utf8');
    console.log(`Build completed. Output written to ${outputFilePath}`);
    if (options.minify) {
      console.log('Minification was applied.');
    }

    let unusedFiles = findUnusedFiles('src', usedFiles);
    if (unusedFiles.size > 0) {
      console.log('\nWARNING: The following files in the src directory were not used in the build:');
      Array.from(unusedFiles).sort().forEach(file => {
        console.log(`  - ${file}`);
      });
    }

  } catch (e) {
    console.error(`An error occurred: ${e}`);
  }
}

if (require.main === module) {
  main();
}
