// Minimal GitHub Action wrapper - no @actions/core dependency needed
const fs = require('fs');
const path = require('path');

// Simple @actions/core replacements using environment
function getInput(name) {
  return process.env[`INPUT_${name.replace(/-/g, '_').toUpperCase()}`] || '';
}

function setOutput(name, value) {
  const filePath = process.env.GITHUB_OUTPUT;
  if (filePath) {
    fs.appendFileSync(filePath, `${name}=${value}\n`);
  }
}

function info(msg) {
  console.log(msg);
}

function setFailed(msg) {
  console.error(`::error::${msg}`);
  process.exitCode = 1;
}

async function run() {
  try {
    // Dynamically require readdown from dist
    const { readdown } = require('../dist/index.js');

    const url = getInput('url');
    const htmlFile = getInput('html-file');
    const outputFile = getInput('output-file');
    const raw = getInput('raw') === 'true';
    const includeHeader = getInput('include-header') !== 'false';

    let html;

    if (url) {
      info(`Fetching ${url}...`);
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
      }
      html = await res.text();
    } else if (htmlFile) {
      info(`Reading ${htmlFile}...`);
      html = fs.readFileSync(htmlFile, 'utf-8');
    } else {
      throw new Error('Either url or html-file input is required');
    }

    const result = readdown(html, {
      url: url || undefined,
      raw,
      includeHeader,
    });

    setOutput('markdown', result.markdown);
    setOutput('tokens', result.tokens.toString());
    setOutput('title', result.metadata.title || '');

    if (outputFile) {
      const dir = path.dirname(outputFile);
      if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(outputFile, result.markdown);
      info(`Markdown written to ${outputFile}`);
    }

    info(`Converted: ${result.tokens} tokens, ${result.chars} chars`);
    if (result.metadata.title) {
      info(`Title: ${result.metadata.title}`);
    }
  } catch (error) {
    setFailed(error.message);
  }
}

run();
