require('dotenv').config({ path: require('path').join(__dirname, '.env') });

module.exports = {
  apps: [
    {
      name: 'magmaweld-api',
      script: 'dist/index.js',
      cwd: __dirname,
      restart_delay: 3000,
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production',
        PORT: process.env.PORT || 3000,
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_SECRET: process.env.JWT_SECRET,
        JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
        TELEGRAM_ADMIN_USERNAME: process.env.TELEGRAM_ADMIN_USERNAME || 'calmjesper',
        TELEGRAM_ADMIN_CHAT_ID: process.env.TELEGRAM_ADMIN_CHAT_ID,
        SERVER_HEALTH_URL: process.env.SERVER_HEALTH_URL,
      },
    },
  ],
};
