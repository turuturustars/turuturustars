#!/usr/bin/env node

/**
 * Email Configuration Switcher
 * 
 * Easily switch between production and local development email configurations
 * 
 * Usage:
 *   npm run config:dev    - Switch to local development (http://localhost:5173)
 *   npm run config:prod   - Switch to production (https://turuturustars.co.ke)
 *   npm run config:show   - Show current configuration
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../supabase/config.toml');

const CONFIGS = {
  dev: {
    name: 'Development (localhost:5173)',
    site_url: 'http://localhost:5173',
  },
  prod: {
    name: 'Production (turuturustars.co.ke)',
    site_url: 'https://turuturustars.co.ke',
  },
};

function readConfig() {
  try {
    return fs.readFileSync(CONFIG_PATH, 'utf8');
  } catch (err) {
    console.error('❌ Error reading config:', err.message);
    process.exit(1);
  }
}

function writeConfig(content) {
  try {
    fs.writeFileSync(CONFIG_PATH, content, 'utf8');
  } catch (err) {
    console.error('❌ Error writing config:', err.message);
    process.exit(1);
  }
}

function getSiteUrl(config) {
  const match = config.match(/site_url\s*=\s*"([^"]+)"/);
  return match ? match[1] : null;
}

function setSiteUrl(config, newUrl) {
  return config.replace(
    /site_url\s*=\s*"[^"]+"/,
    `site_url = "${newUrl}"`
  );
}

function showConfig() {
  const config = readConfig();
  const currentUrl = getSiteUrl(config);
  
  console.log('\n📋 Current Email Configuration:\n');
  console.log('File:', CONFIG_PATH);
  console.log('Current site_url:', currentUrl);
  
  console.log('\nAvailable configurations:');
  Object.entries(CONFIGS).forEach(([key, cfg]) => {
    const isCurrent = currentUrl === cfg.site_url;
    console.log(`  ${isCurrent ? '✅' : '  '} ${key.padEnd(6)} - ${cfg.name}`);
    console.log(`       site_url: ${cfg.site_url}`);
  });
  console.log('\n');
}

function switchConfig(target) {
  if (!CONFIGS[target]) {
    console.error(`❌ Unknown configuration: ${target}`);
    console.error(`Available: ${Object.keys(CONFIGS).join(', ')}`);
    process.exit(1);
  }

  const config = readConfig();
  const currentUrl = getSiteUrl(config);
  const newUrl = CONFIGS[target].site_url;

  if (currentUrl === newUrl) {
    console.log(`✅ Already configured for ${target}!`);
    console.log(`   site_url: ${newUrl}`);
    return;
  }

  const newConfig = setSiteUrl(config, newUrl);
  writeConfig(newConfig);

  console.log(`\n✅ Email configuration switched to ${target}!\n`);
  console.log(`   From: ${currentUrl}`);
  console.log(`   To:   ${newUrl}\n`);
  console.log(`📧 Emails will now redirect to: ${newUrl}\n`);

  if (target === 'dev') {
    console.log('💡 Run: npm run dev');
    console.log('✉️  Test signup at: http://localhost:5173/auth\n');
  } else {
    console.log('💡 Ready for production deployment');
    console.log('✉️  Emails will redirect to: https://turuturustars.co.ke\n');
  }
}

function main() {
  const command = process.argv[2] || 'show';

  switch (command) {
    case 'dev':
      switchConfig('dev');
      break;
    case 'prod':
      switchConfig('prod');
      break;
    case 'show':
      showConfig();
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log('\nUsage:');
      console.log('  npm run config:dev   - Switch to development');
      console.log('  npm run config:prod  - Switch to production');
      console.log('  npm run config:show  - Show current configuration\n');
      process.exit(1);
  }
}

main();
