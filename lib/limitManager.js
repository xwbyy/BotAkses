const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
dayjs.extend(duration);

class LimitManager {
  constructor(sheetDB) {
    this.sheetDB = sheetDB;
    this.DEFAULT_LIMIT = 4;
    this.RESET_DAYS = 7;
  }

  async getUserLimit(userId) {
    const users = await this.sheetDB.find({ userId: userId.toString() });
    if (users.length === 0) {
      return {
        remaining: this.DEFAULT_LIMIT,
        nextReset: dayjs().add(this.RESET_DAYS, 'day').toISOString(),
        totalAdded: 0
      };
    }

    const user = users[0];
    const now = dayjs();
    const lastReset = dayjs(user.lastReset || now.subtract(this.RESET_DAYS, 'day'));
    const nextReset = lastReset.add(this.RESET_DAYS, 'day');

    if (now.isAfter(nextReset)) {
      // Reset limit
      const newLimit = Math.min(this.DEFAULT_LIMIT, user.totalLimit + 1);
      await this.sheetDB.update(user.id, {
        remaining: newLimit,
        lastReset: now.toISOString(),
        nextReset: nextReset.add(this.RESET_DAYS, 'day').toISOString(),
        totalLimit: newLimit
      });

      return {
        remaining: newLimit,
        nextReset: nextReset.add(this.RESET_DAYS, 'day').toISOString(),
        totalAdded: user.totalAdded || 0
      };
    }

    return {
      remaining: user.remaining || 0,
      nextReset: user.nextReset || nextReset.toISOString(),
      totalAdded: user.totalAdded || 0
    };
  }

  async decrementLimit(userId) {
    const users = await this.sheetDB.find({ userId: userId.toString() });
    if (users.length === 0) {
      await this.sheetDB.create({
        userId: userId.toString(),
        remaining: this.DEFAULT_LIMIT - 1,
        lastReset: dayjs().toISOString(),
        nextReset: dayjs().add(this.RESET_DAYS, 'day').toISOString(),
        totalLimit: this.DEFAULT_LIMIT,
        totalAdded: 1
      });
      return this.DEFAULT_LIMIT - 1;
    }

    const user = users[0];
    const newRemaining = Math.max(0, (user.remaining || this.DEFAULT_LIMIT) - 1);
    const newTotalAdded = (user.totalAdded || 0) + 1;

    await this.sheetDB.update(user.id, {
      remaining: newRemaining,
      totalAdded: newTotalAdded
    });

    return newRemaining;
  }

  formatResetTime(isoString) {
    return dayjs(isoString).format('DD/MM/YYYY HH:mm:ss');
  }
}

module.exports = LimitManager;
