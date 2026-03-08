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
      },
    },
  ],
};
