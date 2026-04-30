import { copyFileSync, mkdirSync } from 'fs';

mkdirSync('build/public', { recursive: true });
copyFileSync('src/client/index.html', 'build/public/index.html');