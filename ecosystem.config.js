module.exports = {
  apps: [
    {
      name: 'lnk-api',
      script: 'dist/main.js',
      instances: 1, // Change to 'max' for clustering, or set a specific number
      exec_mode: 'fork', // Use "cluster" if you want to leverage multi-core systems
      env: {
        NODE_ENV: 'production',
        PORT: 3044,
      },
    },
  ],
};
