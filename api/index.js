const { Telegraf } = require('telegraf');
const SheetDB = require('../lib/sheetdb');
const LimitManager = require('../lib/limitManager');
const Bot = require('../lib/bot');

// Load configuration
const BOT_TOKEN = process.env.BOT_TOKEN || '7650452719:AAF9_Fz4McpOd9834SFC3K5HsvmZkrvf87o';
const SHEETDB_TOKEN = process.env.SHEETDB_TOKEN || '6yrpbh06pwxzvuco6sew8y53lr448h964hxqejni';
const SHEETDB_URL = process.env.SHEETDB_URL || 'https://sheetdb.io/api/v1/z7nizpo5qivrt';
const OWNER_ID = process.env.OWNER_ID || '1618920755';

// Initialize services
const sheetDB = new SheetDB(SHEETDB_URL, SHEETDB_TOKEN);
const limitManager = new LimitManager(sheetDB);
const bot = new Bot(BOT_TOKEN, sheetDB, limitManager, OWNER_ID);

// Vercel handler
module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling update:', error);
    res.status(500).send('Error');
  }
};

// For local development
if (process.env.NODE_ENV !== 'production') {
  bot.launch();
  console.log('Bot is running locally...');
}

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
