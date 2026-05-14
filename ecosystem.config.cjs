module.exports = {
  apps: [
    {
      name: 'tg-services-bot',
      script: 'dist/index.js',
      cwd: '/home/ms/tg-services-bot',
      node_args: '--enable-source-maps --no-warnings',
      max_memory_restart: '300M',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
