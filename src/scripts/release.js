require('dotenv').config();
const execSync = require('child_process').execSync;
const rimraf = require('rimraf');

(async function() {
  console.log('Creating release build...');

  const { env } = process;

  if (!env.RELEASE_COMMIT_SHA) {
    console.warn('RELEASE_COMMIT_SHA is not set');

    return;
  }

  env.REACT_APP_SENTRY_RELEASE = `web.${env.RELEASE_COMMIT_SHA}-${env.REACT_APP_NODE_ENV}`;
  const release = env.REACT_APP_SENTRY_RELEASE;

  execSync('npm run build', { env, stdio: 'inherit' });

  execSync('npm install @sentry/cli@1.67.2 --unsafe-perm', { stdio: 'inherit' });

  const SentryCli = require('@sentry/cli');

  const cli = new SentryCli(null, {
    authToken: env.SENTRY_AUTH_TOKEN,
    dsn: env.REACT_APP_SENTRY_DSN,
    project: 'javascript-react',
    org: 'hubytskyi',
  });

  try {
    console.log(`Creating Sentry release ${release}...`);
    await cli.releases.new(release);

    console.log('Uploading source maps to Sentry...');
    await cli.releases.uploadSourceMaps(release, {
      include: ['build/static/js'],
      urlPrefix: '~/static/js',
      rewrite: false,
    });

    console.log('Finalizing release...');
    await cli.releases.finalize(release);

    console.log('Removing source maps...');
    rimraf.sync('./build/**/*.js.map');
  } catch (err) {
    console.error('Source maps uploading failed:', err);
  }
})();
