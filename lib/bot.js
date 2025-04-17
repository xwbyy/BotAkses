const { Telegraf, Markup } = require('telegraf');
const dayjs = require('dayjs');

class Bot {
  constructor(token, sheetDB, limitManager, ownerId) {
    this.bot = new Telegraf(token);
    this.sheetDB = sheetDB;
    this.limitManager = limitManager;
    this.ownerId = ownerId;

    this.setupCommands();
  }

  setupCommands() {
    // Add IP command
    this.bot.command('addakses', async (ctx) => {
      const userId = ctx.from.id;
      const isOwner = userId.toString() === this.ownerId;
      
      // Validate input
      const input = ctx.message.text.split(' ')[1];
      if (!input || !input.includes('|')) {
        return ctx.reply('Format salah. Gunakan: /addakses nama|IP');
      }

      const [name, ip] = input.split('|').map(s => s.trim());
      
      // Validate IP format (simple validation)
      if (!this.validateIP(ip)) {
        return ctx.reply('Format IP tidak valid.');
      }

      // Check limit (except for owner)
      if (!isOwner) {
        const limit = await this.limitManager.getUserLimit(userId);
        if (limit.remaining <= 0) {
          const resetTime = this.limitManager.formatResetTime(limit.nextReset);
          return ctx.reply(`Limit harian Anda telah habis. Limit akan direset pada ${resetTime}.`);
        }
      }

      // Add IP to database
      try {
        await this.sheetDB.create({
          userId: userId.toString(),
          name,
          ip,
          createdAt: dayjs().toISOString()
        });

        // Decrement limit (except for owner)
        if (!isOwner) {
          const remaining = await this.limitManager.decrementLimit(userId);
          ctx.reply(`IP ${ip} berhasil ditambahkan. Limit tersisa: ${remaining}`);
        } else {
          ctx.reply(`IP ${ip} berhasil ditambahkan (Owner).`);
        }
      } catch (error) {
        console.error('Error adding IP:', error);
        ctx.reply('Gagal menambahkan IP. Silakan coba lagi.');
      }
    });

    // List my IPs command
    this.bot.command('myip', async (ctx) => {
      const userId = ctx.from.id;
      const ips = await this.sheetDB.find({ userId: userId.toString() });
      
      if (ips.length === 0) {
        return ctx.reply('Anda belum menambahkan IP apapun.');
      }

      const ipList = ips.map(entry => `- ${entry.name}: ${entry.ip}`).join('\n');
      ctx.reply(`IP yang Anda tambahkan:\n${ipList}`);
    });

    // Check limit command
    this.bot.command('ceklimit', async (ctx) => {
      const userId = ctx.from.id;
      const isOwner = userId.toString() === this.ownerId;
      
      if (isOwner) {
        return ctx.reply('Anda adalah owner, tidak ada limit.');
      }

      const limit = await this.limitManager.getUserLimit(userId);
      const resetTime = this.limitManager.formatResetTime(limit.nextReset);
      
      ctx.reply(
        `Limit Anda:\n` +
        `- Tersisa: ${limit.remaining}\n` +
        `- Total ditambahkan: ${limit.totalAdded}\n` +
        `- Reset berikutnya: ${resetTime}`
      );
    });

    // Owner-only commands
    this.bot.command('delakses', async (ctx) => {
      const userId = ctx.from.id;
      if (userId.toString() !== this.ownerId) {
        return ctx.reply('Hanya owner yang bisa menggunakan command ini.');
      }

      const ip = ctx.message.text.split(' ')[1];
      if (!ip) {
        return ctx.reply('Format salah. Gunakan: /delakses IP');
      }

      try {
        const entries = await this.sheetDB.find({ ip });
        if (entries.length === 0) {
          return ctx.reply('IP tidak ditemukan.');
        }

        for (const entry of entries) {
          await this.sheetDB.delete(entry.id);
        }

        ctx.reply(`IP ${ip} berhasil dihapus.`);
      } catch (error) {
        console.error('Error deleting IP:', error);
        ctx.reply('Gagal menghapus IP. Silakan coba lagi.');
      }
    });

    // Help command
    this.bot.command('help', (ctx) => {
      const isOwner = ctx.from.id.toString() === this.ownerId;
      
      let helpText = `
<b>Perintah yang tersedia:</b>
/addakses nama|IP - Tambahkan IP baru
/myip - Lihat daftar IP Anda
/ceklimit - Cek limit Anda
      `;

      if (isOwner) {
        helpText += `
<code>Perintah Owner:</code>
/delakses IP - Hapus IP
        `;
      }

      ctx.replyWithHTML(helpText);
    });

    // Start command
    this.bot.command('start', (ctx) => {
      ctx.replyWithHTML(
        `Selamat datang di VynaaDB Bot!\n\n` +
        `Gunakan /help untuk melihat daftar perintah.`
      );
    });
  }

  validateIP(ip) {
    // Simple IP validation (IPv4)
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    return ipv4Regex.test(ip);
  }

  async handleUpdate(update) {
    return this.bot.handleUpdate(update);
  }

  launch() {
    return this.bot.launch();
  }

  stop(signal) {
    return this.bot.stop(signal);
  }
}

module.exports = Bot;
